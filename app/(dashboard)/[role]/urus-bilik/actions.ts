"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { PrismaClient } from "@/app/generated/prisma/client"
import { requireRole, type Role } from "@/lib/rbac"
import { getOccupancySummary, getActiveWindow, ALLOCATIONS_PUBLISHED_KEY, ROOM_FEE_SINGLE_KEY, ROOM_FEE_DOUBLE_KEY } from "@/lib/bilik"
import { revalidatePath } from "next/cache"
import { parseCsvToObjects } from "@/lib/csv"
import { mapEkolejRows, groupMappedRooms, blockGender, nowMalaysia, windowState, type MappedRow, type RoomStatus, type RoomType } from "@/lib/room-selection"
import { roomCode, parseRoomNumber } from "@/lib/bilik-format"
import { reconcileIntakeStudents } from "@/lib/registration"
import type { OccupancySummary } from "@/components/shared/bilik/types"

const ADMIN: Role[] = ["superadmin", "admin_kiz"]

async function requireAdmin() {
  const session = await auth()
  requireRole(session?.user?.role as Role | undefined, ADMIN)
  return session!
}

// ── Import ──────────────────────────────────────────────────────────────────

export interface ImportPreview {
  headers: string[]
  totalRows: number
  /** Valid new students that will be created. */
  studentCount: number
  /** Rooms that will be created (occupied + flagged). */
  roomCount: number
  /** Damaged / reserved / staff rooms among them. */
  flaggedCount: number
  duplicateCount: number
  invalidCount: number
  existingDuplicateCount: number
  emptyCount: number
  /** Beds held by non-student residents (Pengetua, mobility, staff). */
  occupantCount: number
  rows: {
    index: number
    matricId: string
    name: string
    gender: string
    room: string | null
    roomType: RoomType | null
    roomStatus: RoomStatus
    status: "ok" | "duplicate" | "invalid" | "existing" | "room" | "occupant" | "empty"
    reason?: string
  }[]
}

/** Matrics already present in the active intake (cross-file duplicates). */
async function activeIntakeMatrics(): Promise<Set<string>> {
  const activeIntake = await prisma.intake.findFirst({
    where: { status: "active", deletedAt: null },
  })
  const existing = new Set<string>()
  if (activeIntake) {
    const rows = await prisma.eligibleStudent.findMany({
      where: { intakeId: activeIntake.id, deletedAt: null },
      select: { matricId: true },
    })
    rows.forEach((r) => existing.add(r.matricId))
  }
  return existing
}

/** Parse + validate a CSV without writing. Also flags matrics already in an active intake. */
export async function previewImport(csvText: string): Promise<ImportPreview> {
  await requireAdmin()

  const { headers, rows } = parseCsvToObjects(csvText)
  const mapped = mapEkolejRows(rows)
  const existing = await activeIntakeMatrics()

  let studentCount = 0
  let duplicateCount = 0
  let invalidCount = 0
  let existingDuplicateCount = 0
  let emptyCount = 0
  let occupantCount = 0

  const previewRows = mapped.map((m: MappedRow, index) => {
    let status: ImportPreview["rows"][number]["status"]
    let reason: string | undefined

    if (m.issue.kind === "invalid") {
      status = "invalid"
      reason = m.issue.reason
      invalidCount++
    } else if (m.issue.kind === "duplicate") {
      status = "duplicate"
      reason = m.issue.reason
      duplicateCount++
    } else if (m.issue.kind === "room") {
      status = "room"
      reason = m.issue.reason
    } else if (m.issue.kind === "occupant") {
      status = "occupant"
      reason = m.issue.reason
      occupantCount++
    } else if (m.issue.kind === "empty") {
      status = "empty"
      emptyCount++
    } else if (m.mapped && existing.has(m.mapped.matricId)) {
      status = "existing"
      reason = "Already in the active intake"
      existingDuplicateCount++
    } else {
      status = "ok"
      studentCount++
    }

    return {
      index: index + 1,
      matricId: m.mapped?.matricId ?? m.raw["NO.MATRIK"] ?? m.raw["No. Matrik"] ?? "—",
      name: m.mapped?.name ?? m.raw["NAME"] ?? m.raw["Nama"] ?? "—",
      gender: m.mapped?.gender ?? "—",
      room: m.roomCode,
      roomType: m.roomType,
      roomStatus: m.roomStatus,
      status,
      reason,
    }
  })

  // Rooms that will actually be created: any room with a new student, plus every
  // flagged (damaged / reserve / staff) room.
  const rooms = groupMappedRooms(mapped)
  let roomCount = 0
  let flaggedCount = 0
  for (const room of rooms) {
    const hasNewStudent = room.students.some((s) => !existing.has(s.matricId))
    if (room.flagged) flaggedCount++
    if (room.flagged || hasNewStudent || room.reservedBeds > 0) roomCount++
  }

  return {
    headers,
    totalRows: mapped.length,
    studentCount,
    roomCount,
    flaggedCount,
    duplicateCount,
    invalidCount,
    existingDuplicateCount,
    emptyCount,
    occupantCount,
    rows: previewRows,
  }
}

/** Commit an import: create an Intake, rooms (with status), and assign beds. */
export async function confirmImport(
  csvText: string,
  intakeName: string,
): Promise<{ ok: boolean; imported: number; roomsCreated?: number; flaggedRooms?: number; error?: string }> {
  const session = await requireAdmin()
  try {
    if (!intakeName.trim()) return { ok: false, imported: 0, error: "Give the intake a name" }

    const { rows } = parseCsvToObjects(csvText)
    const mapped = mapEkolejRows(rows)
    const existing = await activeIntakeMatrics()

    // Group by room, drop students already in the active intake, and keep only
    // rooms that have a new student or are flagged (damaged / reserve / staff).
    const rooms = groupMappedRooms(mapped)
      .map((room) => ({ ...room, students: room.students.filter((s) => !existing.has(s.matricId)) }))
      .filter((room) => room.flagged || room.students.length > 0 || room.reservedBeds > 0)

    if (rooms.length === 0) {
      return {
        ok: false,
        imported: 0,
        error: "No new valid rows to import (invalid, duplicate, and already-listed rows are skipped)",
      }
    }

    let imported = 0
    let roomsCreated = 0
    let flaggedRooms = 0

    await prisma.$transaction(async (tx) => {
      const intake = await tx.intake.create({
        data: {
          name: intakeName.trim(),
          status: "imported",
          importedById: session.user.id,
          rowCount: rooms.reduce((n, r) => n + r.students.length, 0),
        },
      })

      for (const room of rooms) {
        const parsed = parseRoomNumber(room.block, room.code)
        if (!parsed) throw new Error(`Room "${room.code}" doesn't look like a room number (block · floor · 2-digit room)`)
        const gender = blockGender(room.block)
        if (!gender) throw new Error(`Unknown block "${room.block}" — add it to BLOCK_GENDER_MAP first`)

        // A room with no students and only reserved beds is fully held back.
        const status: RoomStatus = room.flagged
          ? room.status
          : room.students.length === 0 && room.reservedBeds > 0
            ? "closed"
            : "available"

        const block = await ensureBlock(tx, room.block, gender, parsed.floor)
        const roomId = await ensureRoom(tx, block.id, { code: room.code, type: room.type, status }, parsed.floor)
        roomsCreated++
        if (room.flagged) flaggedRooms++

        for (const student of room.students) {
          const created = await tx.eligibleStudent.create({
            data: {
              intakeId: intake.id,
              matricId: student.matricId,
              name: student.name,
              gender: student.gender,
              faculty: student.faculty,
              yearOfStudy: student.yearOfStudy,
              religion: student.religion,
              race: student.race,
              nationality: student.nationality,
              currentCollege: student.currentCollege,
              choice1: student.choice1,
              applicationDate: student.applicationDate,
              applicationStatus: student.applicationStatus,
              isB40: student.isB40,
              isOku: student.isOku,
              isUniform: student.isUniform,
              merit: student.merit,
            },
          })
          await claimBed(tx, roomId, created.id, room.code)
          imported++
        }

        if (room.reservedBeds > 0) await markReservedBeds(tx, roomId, room.reservedBeds)
      }
    })

    revalidatePath(`/${session.user.role}/urus-bilik`)
    revalidatePath("/ahli")
    return { ok: true, imported, roomsCreated, flaggedRooms }
  } catch (e) {
    return { ok: false, imported: 0, error: e instanceof Error ? e.message : "Import failed" }
  }
}

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">

/** Find-or-create a block with the given gender; grow its floor count to fit. */
async function ensureBlock(tx: Tx, name: string, gender: "male" | "female", floor: number) {
  const existing = await tx.residenceBlock.findFirst({ where: { name, deletedAt: null } })
  if (existing) {
    if (existing.gender !== gender) {
      throw new Error(
        `Block ${name} is set to ${existing.gender} in the system but the file places ${gender} students there. Fix the block gender first.`,
      )
    }
    if (existing.floors < floor + 1) {
      await tx.residenceBlock.update({ where: { id: existing.id }, data: { floors: floor + 1 } })
    }
    return existing
  }
  return tx.residenceBlock.create({
    data: { name, gender, floors: Math.max(floor + 1, 2) },
  })
}

/**
 * Find-or-create a room with the file's type (single/double) and status, then
 * make sure its beds match the type. Returns the room id.
 */
async function ensureRoom(
  tx: Tx,
  blockId: string,
  room: { code: string; type: RoomType; status: RoomStatus },
  floor: number,
): Promise<string> {
  const existing = await tx.residenceRoom.findFirst({
    where: { blockId, number: room.code, deletedAt: null },
    include: { beds: true },
  })

  if (existing) {
    const occupied = existing.beds.filter((b) => !b.deletedAt && b.occupantId).length
    if (existing.type !== room.type) {
      if (occupied > 0) {
        throw new Error(
          `Room ${room.code} already has ${occupied} occupant(s) as a ${existing.type} room — the file says ${room.type}. Resolve the mismatch first.`,
        )
      }
      await tx.residenceRoom.update({ where: { id: existing.id }, data: { type: room.type } })
    }
    await tx.residenceRoom.update({ where: { id: existing.id }, data: { status: room.status } })
    await syncBeds(tx, existing.id, room.type, existing.beds)
    return existing.id
  }

  const created = await tx.residenceRoom.create({
    data: { blockId, floor, number: room.code, type: room.type, status: room.status, sortOrder: 0 },
  })
  await syncBeds(tx, created.id, room.type, [])
  return created.id
}

/**
 * Ensure a room has exactly the beds its type needs (single → 1, double → 2).
 * `current` must include soft-deleted beds: the `(roomId, position)` unique
 * constraint ignores `deletedAt`, so a bed is revived rather than re-created.
 */
async function syncBeds(
  tx: Tx,
  roomId: string,
  type: RoomType,
  current: { id: string; position: string; occupantId: string | null; reserved: boolean; deletedAt: Date | null }[],
): Promise<void> {
  const wanted = type === "single" ? ["single"] : ["left", "right"]
  for (const position of wanted) {
    const bed = current.find((b) => b.position === position)
    if (!bed) {
      await tx.bed.create({ data: { roomId, position: position as "single" | "left" | "right" } })
    } else if (bed.deletedAt) {
      await tx.bed.update({ where: { id: bed.id }, data: { deletedAt: null } })
    }
  }
  // Soft-delete stray beds (e.g. a former twin) that have no occupant.
  for (const bed of current) {
    if (!wanted.includes(bed.position) && !bed.occupantId && !bed.reserved && !bed.deletedAt) {
      await tx.bed.update({ where: { id: bed.id }, data: { deletedAt: nowMalaysia() } })
    }
  }
}

/** Claim the first free, non-reserved bed in a room (twins left → right). */
async function claimBed(tx: Tx, roomId: string, studentId: string, code: string): Promise<void> {
  const beds = await tx.bed.findMany({ where: { roomId, deletedAt: null, reserved: false } })
  const free = beds
    .filter((b) => !b.occupantId)
    .sort((a, b) => bedPriority(a.position) - bedPriority(b.position))
  if (free.length === 0) throw new Error(`Room ${code} is already full — no free bed.`)

  const claimed = await tx.bed.updateMany({
    where: { id: free[0].id, occupantId: null, reserved: false, deletedAt: null },
    data: { occupantId: studentId },
  })
  if (claimed.count === 0) throw new Error(`Bed in ${code} was just taken — try the import again.`)

  await tx.eligibleStudent.update({
    where: { id: studentId },
    data: { selectedAt: nowMalaysia(), assignedByAdmin: true },
  })
}

/** Hold back the next free beds in a room (emergency / pengetua quota / staff). */
async function markReservedBeds(tx: Tx, roomId: string, count: number): Promise<void> {
  if (count <= 0) return
  const beds = await tx.bed.findMany({
    where: { roomId, deletedAt: null, occupantId: null, reserved: false },
  })
  const targets = beds
    .sort((a, b) => bedPriority(a.position) - bedPriority(b.position))
    .slice(0, count)
  for (const bed of targets) {
    await tx.bed.update({ where: { id: bed.id }, data: { reserved: true } })
  }
}

/**
 * Change a room's type (single ↔ twin) from the inventory. Occupants are kept:
 * a single room with a student becomes a twin with that student in Bed A; a twin
 * can only become single when at most one bed is occupied. Existing bed rows are
 * revived/soft-deleted (never hard-deleted) so the `(roomId, position)` unique
 * constraint is always satisfied.
 */
export async function updateRoomType(roomId: string, type: RoomType) {
  const session = await requireAdmin()
  await prisma.$transaction(async (tx) => {
    const room = await tx.residenceRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      include: { beds: true },
    })
    if (!room) throw new Error("Room not found")
    if (room.type === type) return

    const occupants = room.beds.filter((b) => b.occupantId)
    if (type === "single" && occupants.length > 1) {
      throw new Error("Both beds are occupied — move one student out before switching to a single room.")
    }

    const wanted = (type === "single" ? ["single"] : ["left", "right"]) as ("single" | "left" | "right")[]

    // Ensure a bed row exists for each wanted position (revive a tombstone when
    // one is already there, otherwise create).
    const ensured = new Map<string, string>()
    for (const position of wanted) {
      const existing = room.beds.find((b) => b.position === position)
      if (existing) {
        if (existing.deletedAt) await tx.bed.update({ where: { id: existing.id }, data: { deletedAt: null } })
        ensured.set(position, existing.id)
      } else {
        const created = await tx.bed.create({ data: { roomId, position } })
        ensured.set(position, created.id)
      }
    }

    // Clear every occupant in the room first, then re-place them (avoids the
    // unique `occupantId` clashing while moving).
    for (const bed of occupants) {
      await tx.bed.update({ where: { id: bed.id }, data: { occupantId: null } })
    }
    let index = 0
    for (const bed of occupants) {
      const position = wanted[Math.min(index, wanted.length - 1)]
      const targetBedId = ensured.get(position)!
      await tx.bed.update({ where: { id: targetBedId }, data: { occupantId: bed.occupantId } })
      index++
    }

    // Soft-delete any bed whose position is no longer wanted.
    for (const bed of room.beds) {
      if (!wanted.includes(bed.position) && !bed.deletedAt) {
        await tx.bed.update({ where: { id: bed.id }, data: { deletedAt: nowMalaysia() } })
      }
    }

    await tx.residenceRoom.update({ where: { id: roomId }, data: { type } })
  })
  revalidatePath(`/${session.user.role}/urus-bilik`)
  revalidatePath("/ahli")
}

function bedPriority(position: string): number {
  return position === "left" ? 0 : position === "right" ? 1 : 2
}

/** Activate an intake (archives any other active one). */
export async function activateIntake(intakeId: string) {
  const session = await requireAdmin()
  await prisma.$transaction([
    prisma.intake.updateMany({ where: { status: "active" }, data: { status: "archived" } }),
    prisma.intake.update({ where: { id: intakeId }, data: { status: "active" } }),
  ])

  // Tally self-registered accounts against the newly active list: unlock pending
  // students whose matric appears and link every registered owner to their row.
  const unlocked = await reconcileIntakeStudents(intakeId)
  if (unlocked > 0) {
    console.info(`[intake] activated intake ${intakeId} — unlocked ${unlocked} pending account(s)`)
  }

  revalidatePath(`/${session.user.role}/urus-bilik`)
}

// ── Selection window ──────────────────────────────────────────────────────

export async function saveWindow(input: {
  name: string
  opensAt: string
  closesAt: string
  closingSoonHours: number
}) {
  const session = await requireAdmin()
  const opens = new Date(input.opensAt)
  const closes = new Date(input.closesAt)
  if (opens >= closes) throw new Error("Close time must be after open time")

  await prisma.$transaction([
    prisma.selectionWindow.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.selectionWindow.create({
      data: {
        name: input.name.trim() || "Room selection",
        opensAt: opens,
        closesAt: closes,
        closingSoonHours: input.closingSoonHours,
        isActive: true,
      },
    }),
  ])
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

export async function setAllocationsPublished(published: boolean) {
  const session = await requireAdmin()
  if (published) {
    // Results can only be revealed after the application period has closed.
    const win = await getActiveWindow()
    const closed = win
      ? windowState(
          { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
          nowMalaysia(),
        ) === "closed"
      : false
    if (!win) throw new Error("Set up an application period before publishing results.")
    if (!closed) {
      throw new Error("Room results can only be published after the application period closes.")
    }
    const intake = await prisma.intake.findFirst({ where: { status: "active", deletedAt: null } })
    if (intake) {
      const awaiting = await prisma.eligibleStudent.count({ where: { intakeId: intake.id, deletedAt: null, bed: null } })
      if (awaiting > 0) throw new Error(`${awaiting} student${awaiting === 1 ? " is" : "s are"} still awaiting allocation. Complete the list before publishing.`)
    }
  }
  await prisma.appSetting.upsert({
    where: { key: ALLOCATIONS_PUBLISHED_KEY },
    update: { value: String(published) },
    create: { key: ALLOCATIONS_PUBLISHED_KEY, value: String(published) },
  })
  revalidatePath(`/${session.user.role}/urus-bilik`)
  revalidatePath("/ahli/bilik")
  revalidatePath("/ahli")
  revalidatePath("/ahli/kad-maya")
  revalidatePath("/ahli/lagi")
  revalidatePath("/ahli/profile")
}

/** Monthly room fees (RM, per student) shown on the students' Room Selection cards. */
export async function saveRoomFees(input: { single: number | null; double: number | null }) {
  const session = await requireAdmin()
  const parseFee = (v: number | null | undefined, label: string): number | null => {
    if (v == null || Number.isNaN(v)) return null
    if (v < 0) throw new Error(`${label} fee can't be negative.`)
    return v
  }
  const single = parseFee(input.single, "Single room")
  const double = parseFee(input.double, "Twin-sharing room")

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: ROOM_FEE_SINGLE_KEY },
      update: { value: single != null ? String(single) : "" },
      create: { key: ROOM_FEE_SINGLE_KEY, value: single != null ? String(single) : "" },
    }),
    prisma.appSetting.upsert({
      where: { key: ROOM_FEE_DOUBLE_KEY },
      update: { value: double != null ? String(double) : "" },
      create: { key: ROOM_FEE_DOUBLE_KEY, value: double != null ? String(double) : "" },
    }),
  ])
  revalidatePath(`/${session.user.role}/urus-bilik`)
  revalidatePath("/ahli/bilik")
  revalidatePath("/ahli")
}

// ── Building management ────────────────────────────────────────────────────

export async function upsertBlock(input: {
  id?: string
  name: string
  gender: "male" | "female"
  floors: number
  sortOrder?: number
}) {
  const session = await requireAdmin()
  const name = input.name.trim().toUpperCase()
  if (!name) throw new Error("Give the block a name")
  try {
    if (input.id) {
      const existing = await prisma.residenceBlock.findUnique({
        where: { id: input.id },
        include: {
          rooms: {
            where: { deletedAt: null },
            include: { beds: { where: { deletedAt: null, occupantId: { not: null } } } },
          },
        },
      })
      if (!existing) throw new Error("Block not found")

      // Renaming a block changes its room-code prefix ("K18A-101") — only safe
      // while the block has no rooms yet, otherwise stored codes go stale.
      if (existing.name !== name && existing.rooms.length > 0) {
        throw new Error("Rename a block only after removing its rooms, or the stored room codes (e.g. K18A-101) won't match the new name")
      }
      // A block is single-gender — flipping it while beds are occupied would
      // strand students of the opposite gender inside it.
      if (existing.gender !== input.gender) {
        const occupied = existing.rooms.reduce((total, room) => total + room.beds.length, 0)
        if (occupied > 0) {
          throw new Error(`Cannot change the gender — ${occupied} bed${occupied === 1 ? "" : "s"} in this block ${occupied === 1 ? "is" : "are"} occupied. Move the occupants first.`)
        }
      }

      await prisma.residenceBlock.update({
        where: { id: input.id },
        data: { name, gender: input.gender, floors: input.floors, sortOrder: input.sortOrder ?? 0 },
      })
    } else {
      await prisma.residenceBlock.create({
        data: { name, gender: input.gender, floors: input.floors, sortOrder: input.sortOrder ?? 0 },
      })
    }
    revalidatePath(`/${session.user.role}/urus-bilik`)
  } catch (e) {
    throw new Error(
      e instanceof Error && e.message.includes("Unique constraint")
        ? "A block with that name already exists"
        : e instanceof Error
          ? e.message
          : "Failed to save block",
    )
  }
}

/** Create a room and auto-create its beds (single → 1, double → 2). */
export async function createRoom(input: {
  blockId: string
  number: string
  type: "single" | "double"
}) {
  const session = await requireAdmin()
  try {
    const block = await prisma.residenceBlock.findUnique({ where: { id: input.blockId } })
    if (!block) throw new Error("Block not found")

    // Store the canonical full code ("K18A-101"). Accept a full code or a short
    // number ("101") and normalise to the full form; the floor is derived from
    // the code, never entered separately.
    const code = roomCode(block.name, input.number)
    const parsed = parseRoomNumber(block.name, code)
    if (!parsed) {
      throw new Error(`Room number must be a code like "${block.name}-101" (block · floor · 2-digit room)`)
    }

    await prisma.$transaction(async (tx) => {
      const room = await tx.residenceRoom.create({
        data: {
          blockId: input.blockId,
          floor: parsed.floor,
          number: code,
          type: input.type,
        },
      })
      const positions =
        input.type === "single" ? (["single"] as const) : (["left", "right"] as const)
      for (const position of positions) {
        await tx.bed.create({ data: { roomId: room.id, position } })
      }
    })
    revalidatePath(`/${session.user.role}/urus-bilik`)
  } catch (e) {
    throw new Error(e instanceof Error && e.message.includes("Unique constraint")
      ? "That room number already exists in this block"
      : e instanceof Error
        ? e.message
        : "Failed to create room")
  }
}

/** Soft-delete a block. Refuses while any of its rooms has an occupant. */
export async function deleteBlock(blockId: string) {
  const session = await requireAdmin()
  const block = await prisma.residenceBlock.findUnique({
    where: { id: blockId },
    include: {
      rooms: { where: { deletedAt: null }, include: { beds: { where: { deletedAt: null, occupantId: { not: null } } } } },
    },
  })
  if (!block) throw new Error("Block not found")

  const occupied = block.rooms.filter((r) => r.beds.length > 0)
  if (occupied.length > 0) {
    throw new Error(
      `Cannot delete — ${occupied.length} room${occupied.length === 1 ? "" : "s"} still has occupants. Move them first.`,
    )
  }

  await prisma.$transaction([
    prisma.residenceRoom.updateMany({
      where: { blockId, deletedAt: null },
      data: { deletedAt: nowMalaysia() },
    }),
    prisma.residenceBlock.update({ where: { id: blockId }, data: { deletedAt: nowMalaysia() } }),
  ])
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

/** Soft-delete a room and its beds. Refuses while any bed has an occupant. */
export async function deleteRoom(roomId: string) {
  const session = await requireAdmin()
  const room = await prisma.residenceRoom.findUnique({
    where: { id: roomId },
    include: { beds: { where: { deletedAt: null, occupantId: { not: null } } } },
  })
  if (!room) throw new Error("Room not found")
  if (room.beds.length > 0) {
    throw new Error("Cannot delete — the room still has an occupant")
  }

  await prisma.$transaction([
    prisma.bed.updateMany({ where: { roomId, deletedAt: null }, data: { deletedAt: nowMalaysia() } }),
    prisma.residenceRoom.update({ where: { id: roomId }, data: { deletedAt: nowMalaysia() } }),
  ])
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

/** Bulk-generate N sequential rooms on a floor (codes are derived from the block). */
export async function generateFloor(input: {
  blockId: string
  floor: number
  count: number
  type: "single" | "double"
}) {
  const session = await requireAdmin()
  const block = await prisma.residenceBlock.findUnique({ where: { id: input.blockId } })
  if (!block) throw new Error("Block not found")

  await prisma.$transaction(async (tx) => {
    for (let i = 1; i <= input.count; i++) {
      // Canonical full code: block name + floor digit(s) + 2-digit room.
      const number = `${block.name}-${input.floor}${String(i).padStart(2, "0")}`
      const existing = await tx.residenceRoom.findFirst({
        where: { blockId: input.blockId, number, deletedAt: null },
      })
      if (existing) continue
      const room = await tx.residenceRoom.create({
        data: {
          blockId: input.blockId,
          floor: input.floor,
          number,
          type: input.type,
          sortOrder: i,
        },
      })
      const positions =
        input.type === "single" ? (["single"] as const) : (["left", "right"] as const)
      for (const position of positions) {
        await tx.bed.create({ data: { roomId: room.id, position } })
      }
    }
  })
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

/** Guard: a room can't be taken out of service while it still has occupants. */
async function assertRoomsFreeToChange(roomIds: string[]): Promise<void> {
  const ids = [...new Set(roomIds.filter(Boolean))]
  if (ids.length === 0) return
  const occupied = await prisma.bed.count({
    where: {
      roomId: { in: ids },
      occupantId: { not: null },
      deletedAt: null,
    },
  })
  if (occupied > 0) {
    throw new Error(
      `Cannot change the status — ${occupied} bed${occupied === 1 ? "" : "s"} ${occupied === 1 ? "is" : "are"} still occupied. Move the occupants to an available room first.`,
    )
  }
}

export async function setRoomStatus(roomId: string, status: "available" | "maintenance" | "closed") {
  const session = await requireAdmin()
  if (status !== "available") await assertRoomsFreeToChange([roomId])
  await prisma.residenceRoom.update({ where: { id: roomId }, data: { status } })
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

/** Update several rooms together from the inventory workspace. */
export async function setRoomsStatus(roomIds: string[], status: "available" | "maintenance" | "closed") {
  const session = await requireAdmin()
  const ids = [...new Set(roomIds.filter(Boolean))]
  if (ids.length === 0) throw new Error("Select at least one room")
  if (status !== "available") await assertRoomsFreeToChange(ids)
  const result = await prisma.residenceRoom.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { status },
  })
  revalidatePath(`/${session.user.role}/urus-bilik`)
  return result.count
}

// ── Occupancy monitor ──────────────────────────────────────────────────────

export async function getOccupancy(): Promise<OccupancySummary> {
  await requireAdmin()
  return getOccupancySummary()
}

// ── Manual assignment ───────────────────────────────────────────────────────

export async function adminAssign(
  studentId: string,
  bedId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin()
  try {
    // The office may assign rooms as applications come in — students never see
    // their room until the allocation is published (see setAllocationsPublished).
    const student = await prisma.eligibleStudent.findUnique({ where: { id: studentId } })
    if (!student) return { ok: false, error: "Student not found" }

    const confirmedPair = await prisma.roomApplication.findFirst({
      where: {
        status: "roommate_confirmed",
        deletedAt: null,
        OR: [{ applicantId: student.id }, { roommateId: student.id }],
      },
    })
    const roommateId = confirmedPair
      ? confirmedPair.applicantId === student.id ? confirmedPair.roommateId : confirmedPair.applicantId
      : null

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, deletedAt: null },
      include: { room: { include: { block: true, beds: { where: { deletedAt: null } } } } },
    })
    if (!bed) return { ok: false, error: "Bed not found" }
    if (bed.reserved) return { ok: false, error: "That bed is reserved (emergency / quota) and can't be assigned." }
    if (bed.room.status !== "available") {
      return { ok: false, error: "That room is under maintenance or closed" }
    }
    if (bed.room.block.gender !== student.gender) {
      return { ok: false, error: "Block gender doesn't match the student" }
    }
    const roommateBed = roommateId
      ? bed.room.beds.find((candidate) => candidate.id !== bed.id && candidate.occupantId === null && !candidate.reserved)
      : null
    if (roommateId && (bed.room.type !== "double" || !roommateBed)) {
      return { ok: false, error: "A confirmed pair must be assigned to a double room with two free beds" }
    }

    await prisma.$transaction(async (tx) => {
      // For a confirmed pair, both target beds must still be free before either
      // current allocation is released, so a failed move cannot split the pair.
      if (roommateId && roommateBed) {
        const targetBeds = await tx.bed.count({
          where: { id: { in: [bed.id, roommateBed.id] }, occupantId: null, deletedAt: null },
        })
        if (targetBeds !== 2) throw new Error("One of the two beds was just taken")
      }
      // Free the student's current bed and claim the new one atomically.
      await tx.bed.updateMany({ where: { occupantId: student.id }, data: { occupantId: null } })
      const claimed = await tx.bed.updateMany({
        where: { id: bedId, occupantId: null, reserved: false, deletedAt: null },
        data: { occupantId: student.id },
      })
      if (claimed.count === 0) throw new Error("That bed is already taken")
      if (roommateId && roommateBed) {
        await tx.bed.updateMany({ where: { occupantId: roommateId }, data: { occupantId: null } })
        const roommateClaimed = await tx.bed.updateMany({
          where: { id: roommateBed.id, occupantId: null, reserved: false, deletedAt: null },
          data: { occupantId: roommateId },
        })
        if (roommateClaimed.count === 0) throw new Error("The second bed was just taken")
      }
      await tx.eligibleStudent.update({
        where: { id: student.id },
        data: { selectedAt: nowMalaysia(), assignedByAdmin: true },
      })
      await tx.roomApplication.updateMany({
        where: { OR: [{ applicantId: student.id }, { roommateId: student.id }], deletedAt: null },
        data: { status: "allocated" },
      })
      if (roommateId) {
        await tx.eligibleStudent.update({ where: { id: roommateId }, data: { selectedAt: nowMalaysia(), assignedByAdmin: true } })
      }
      // No user.block/room_number writes — the Bed.occupantId link is the single
      // source of truth; member surfaces read their room from the bed graph.
    })

    revalidatePath(`/${session.user.role}/urus-bilik`)
    revalidatePath("/ahli")
    revalidatePath("/ahli/kad-maya")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Assignment failed" }
  }
}


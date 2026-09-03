"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { getOccupancySummary, getActiveWindow, OCCUPANT_PRIVACY_KEY } from "@/lib/bilik"
import { revalidatePath } from "next/cache"
import { parseCsvToObjects } from "@/lib/csv"
import { mapEkolejRows, nowMalaysia, windowState, type MappedRow } from "@/lib/room-selection"
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
  okCount: number
  duplicateCount: number
  invalidCount: number
  existingDuplicateCount: number
  rows: {
    index: number
    matricId: string
    name: string
    gender: string
    status: "ok" | "duplicate" | "invalid" | "existing"
    reason?: string
  }[]
}

/** Parse + validate a CSV without writing. Also flags matrics already in an active intake. */
export async function previewImport(csvText: string): Promise<ImportPreview> {
  await requireAdmin()

  const { headers, rows } = parseCsvToObjects(csvText)
  const mapped = mapEkolejRows(rows)

  // Matrics already present in the active intake (cross-file duplicates).
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

  let okCount = 0
  let duplicateCount = 0
  let invalidCount = 0
  let existingDuplicateCount = 0

  const previewRows = mapped.map((m: MappedRow, index) => {
    let status: "ok" | "duplicate" | "invalid" | "existing"
    let reason: string | undefined

    if (m.issue.kind === "invalid") {
      status = "invalid"
      reason = m.issue.reason
      invalidCount++
    } else if (m.issue.kind === "duplicate") {
      status = "duplicate"
      reason = m.issue.reason
      duplicateCount++
    } else if (m.mapped && existing.has(m.mapped.matricId)) {
      status = "existing"
      reason = "Already in the active intake"
      existingDuplicateCount++
    } else {
      status = "ok"
      okCount++
    }

    return {
      index: index + 1,
      matricId: m.mapped?.matricId ?? m.raw["No. Matrik"] ?? "—",
      name: m.mapped?.name ?? m.raw["Nama"] ?? "—",
      gender: m.mapped?.gender ?? "—",
      status,
      reason,
    }
  })

  return {
    headers,
    totalRows: mapped.length,
    okCount,
    duplicateCount,
    invalidCount,
    existingDuplicateCount,
    rows: previewRows,
  }
}

/** Commit an import: create an Intake + EligibleStudent rows for valid, non-duplicate rows. */
export async function confirmImport(
  csvText: string,
  intakeName: string,
): Promise<{ ok: boolean; imported: number; error?: string }> {
  const session = await requireAdmin()
  try {
    if (!intakeName.trim()) return { ok: false, imported: 0, error: "Give the intake a name" }

    const { rows } = parseCsvToObjects(csvText)

    // Same rule as the preview: only import rows flagged OK. Invalid and
    // in-file duplicates are dropped by mapEkolejRows; here we additionally drop
    // any matric that already exists in the current active intake so confirm can
    // never silently re-import an "existing" row the preview warned about.
    const activeIntake = await prisma.intake.findFirst({
      where: { status: "active", deletedAt: null },
    })
    const existing = new Set<string>()
    if (activeIntake) {
      const current = await prisma.eligibleStudent.findMany({
        where: { intakeId: activeIntake.id, deletedAt: null },
        select: { matricId: true },
      })
      current.forEach((r) => existing.add(r.matricId))
    }

    const mapped = mapEkolejRows(rows).filter(
      (m) => m.issue.kind === "ok" && m.mapped && !existing.has(m.mapped.matricId),
    )

    if (mapped.length === 0) {
      return {
        ok: false,
        imported: 0,
        error: "No new valid rows to import (invalid, duplicate, and already-listed rows are skipped)",
      }
    }

    await prisma.$transaction(async (tx) => {
      const intake = await tx.intake.create({
        data: {
          name: intakeName.trim(),
          status: "imported",
          importedById: session.user.id,
          rowCount: mapped.length,
        },
      })

      for (const m of mapped) {
        const s = m.mapped!
        await tx.eligibleStudent.create({
          data: {
            intakeId: intake.id,
            matricId: s.matricId,
            name: s.name,
            gender: s.gender,
            faculty: s.faculty,
            yearOfStudy: s.yearOfStudy,
            religion: s.religion,
            race: s.race,
            nationality: s.nationality,
            currentCollege: s.currentCollege,
            choice1: s.choice1,
            applicationDate: s.applicationDate,
            applicationStatus: s.applicationStatus,
            isB40: s.isB40,
            isOku: s.isOku,
            isUniform: s.isUniform,
            merit: s.merit,
          },
        })
      }
    })

    revalidatePath(`/${session.user.role}/urus-bilik`)
    return { ok: true, imported: mapped.length }
  } catch (e) {
    return { ok: false, imported: 0, error: e instanceof Error ? e.message : "Import failed" }
  }
}

/** Activate an intake (archives any other active one). */
export async function activateIntake(intakeId: string) {
  const session = await requireAdmin()
  await prisma.$transaction([
    prisma.intake.updateMany({ where: { status: "active" }, data: { status: "archived" } }),
    prisma.intake.update({ where: { id: intakeId }, data: { status: "active" } }),
  ])
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

// ── Occupant privacy ──────────────────────────────────────────────────────

export async function setOccupantPrivacy(mode: "full" | "limited") {
  const session = await requireAdmin()
  await prisma.appSetting.upsert({
    where: { key: OCCUPANT_PRIVACY_KEY },
    update: { value: mode },
    create: { key: OCCUPANT_PRIVACY_KEY, value: mode },
  })
  revalidatePath(`/${session.user.role}/urus-bilik`)
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
  if (!input.name.trim()) throw new Error("Give the block a name")
  try {
    if (input.id) {
      await prisma.residenceBlock.update({
        where: { id: input.id },
        data: {
          name: input.name.trim().toUpperCase(),
          gender: input.gender,
          floors: input.floors,
          sortOrder: input.sortOrder ?? 0,
        },
      })
    } else {
      await prisma.residenceBlock.create({
        data: {
          name: input.name.trim().toUpperCase(),
          gender: input.gender,
          floors: input.floors,
          sortOrder: input.sortOrder ?? 0,
        },
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
  floor: number
  number: string
  type: "single" | "double"
}) {
  const session = await requireAdmin()
  try {
    await prisma.$transaction(async (tx) => {
      const room = await tx.residenceRoom.create({
        data: {
          blockId: input.blockId,
          floor: input.floor,
          number: input.number.trim().toUpperCase(),
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

/** Bulk-generate N sequential rooms on a floor. */
export async function generateFloor(input: {
  blockId: string
  floor: number
  count: number
  type: "single" | "double"
  prefix: string
}) {
  const session = await requireAdmin()
  const block = await prisma.residenceBlock.findUnique({ where: { id: input.blockId } })
  if (!block) throw new Error("Block not found")

  await prisma.$transaction(async (tx) => {
    for (let i = 1; i <= input.count; i++) {
      const number = `${input.prefix}${input.floor}${String(i).padStart(2, "0")}`
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

export async function setRoomStatus(roomId: string, status: "available" | "maintenance" | "closed") {
  const session = await requireAdmin()
  await prisma.residenceRoom.update({ where: { id: roomId }, data: { status } })
  revalidatePath(`/${session.user.role}/urus-bilik`)
}

// ── Occupancy monitor ──────────────────────────────────────────────────────

export async function getOccupancy(): Promise<OccupancySummary> {
  await requireAdmin()
  return getOccupancySummary()
}

// ── Manual assignment (post-deadline backfill) ─────────────────────────────

export async function adminAssign(
  studentId: string,
  bedId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin()
  try {
    // Post-deadline only. Manual backfill must never run while students can
    // still self-select — enforced server-side, not just hidden in the UI.
    const win = await getActiveWindow()
    if (!win) return { ok: false, error: "No selection window is configured" }
    const ws = windowState(
      { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
      nowMalaysia(),
    )
    if (ws !== "closed") {
      return {
        ok: false,
        error: "Manual assignment is only allowed after the selection window closes",
      }
    }

    const student = await prisma.eligibleStudent.findUnique({ where: { id: studentId } })
    if (!student) return { ok: false, error: "Student not found" }

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, deletedAt: null },
      include: { room: { include: { block: true } } },
    })
    if (!bed) return { ok: false, error: "Bed not found" }
    if (bed.room.status !== "available") {
      return { ok: false, error: "That room is under maintenance or closed" }
    }
    if (bed.room.block.gender !== student.gender) {
      return { ok: false, error: "Block gender doesn't match the student" }
    }

    await prisma.$transaction(async (tx) => {
      // Free the student's current bed and claim the new one atomically.
      await tx.bed.updateMany({ where: { occupantId: student.id }, data: { occupantId: null } })
      const claimed = await tx.bed.updateMany({
        where: { id: bedId, occupantId: null, deletedAt: null },
        data: { occupantId: student.id },
      })
      if (claimed.count === 0) throw new Error("That bed is already taken")
      await tx.eligibleStudent.update({
        where: { id: student.id },
        data: { selectedAt: nowMalaysia(), assignedByAdmin: true },
      })
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: { block: bed.room.block.name, roomNumber: bed.room.number },
        })
      }
    })

    revalidatePath(`/${session.user.role}/urus-bilik`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Assignment failed" }
  }
}

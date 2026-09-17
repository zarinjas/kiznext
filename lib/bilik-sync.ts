import { prisma } from "@/lib/db"
import { parseCsvToObjects } from "@/lib/csv"
import {
  mapEkolejRows,
  groupMappedRooms,
  blockGender,
  type GroupedRoom,
  type RoomStatus,
} from "@/lib/room-selection"
import { roomCode, parseRoomNumber } from "@/lib/bilik-format"
import { ensureBlock, ensureRoom, claimBed, markReservedBeds } from "@/lib/bilik-rooms"

/**
 * Accommodation SYNC — unlike `confirmImport` (which creates a NEW intake), sync
 * updates the ACTIVE intake in place: it diffs the sheet against the DB by
 * matric, then adds / moves / releases students and reconciles every room's
 * type, status and reserved beds. The sheet is the source of truth.
 *
 * Pure of auth so it can be unit-tested; the server action wraps it with
 * `requireAdmin()`.
 */

export interface SyncPreview {
  intakeName: string | null
  studentsInSheet: number
  toAdd: { matricId: string; name: string; room: string }[]
  toMove: { matricId: string; name: string; from: string; to: string }[]
  toRelease: { matricId: string; name: string; from: string }[]
  unchanged: number
  roomsTotal: number
  roomsNew: number
  roomsChanged: number
  reservedRooms: number
}

export interface SyncResult {
  ok: boolean
  added?: number
  moved?: number
  released?: number
  roomsSynced?: number
  error?: string
}

/** Effective room status the sheet implies (available / maintenance / closed). */
function effectiveRoomStatus(room: GroupedRoom): RoomStatus {
  if (room.flagged) return room.status
  if (room.students.length === 0 && room.reservedBeds > 0) return "closed"
  return "available"
}

function buildSyncModel(csvText: string) {
  const { rows } = parseCsvToObjects(csvText)
  const rooms = groupMappedRooms(mapEkolejRows(rows))
  const sheetStudents = new Map<string, { name: string; room: string }>()
  for (const room of rooms) {
    for (const student of room.students) sheetStudents.set(student.matricId, { name: student.name, room: room.code })
  }
  return { rooms, sheetStudents }
}

type BedRoomRef = { room: { number: string; block: { name: string } } } | null

function bedRoomCode(bed: BedRoomRef): string | null {
  return bed ? roomCode(bed.room.block.name, bed.room.number) : null
}

async function loadActiveStudents() {
  const intake = await prisma.intake.findFirst({
    where: { status: "active", deletedAt: null },
    select: { id: true, name: true },
  })
  const students = intake
    ? await prisma.eligibleStudent.findMany({
        where: { intakeId: intake.id, deletedAt: null },
        select: {
          id: true,
          matricId: true,
          name: true,
          bed: { select: { room: { select: { number: true, block: { select: { name: true } } } } } },
        },
      })
    : []
  return { intake, students }
}

/** Diff a sheet against the active intake without writing anything. */
export async function runPreviewSync(csvText: string): Promise<SyncPreview> {
  const { rooms, sheetStudents } = buildSyncModel(csvText)
  const { intake, students } = await loadActiveStudents()
  const byMatric = new Map(students.map((s) => [s.matricId, s]))

  const toAdd: SyncPreview["toAdd"] = []
  const toMove: SyncPreview["toMove"] = []
  let unchanged = 0
  for (const [matricId, info] of sheetStudents) {
    const db = byMatric.get(matricId)
    if (!db) {
      toAdd.push({ matricId, name: info.name, room: info.room })
      continue
    }
    const from = bedRoomCode(db.bed)
    if (from && from !== info.room) toMove.push({ matricId, name: info.name, from, to: info.room })
    else unchanged++
  }

  const toRelease: SyncPreview["toRelease"] = []
  for (const student of students) {
    if (sheetStudents.has(student.matricId)) continue
    const from = bedRoomCode(student.bed)
    if (from) toRelease.push({ matricId: student.matricId, name: student.name, from })
  }

  const dbRooms = await prisma.residenceRoom.findMany({
    where: { deletedAt: null },
    select: { number: true, type: true, status: true, block: { select: { name: true } } },
  })
  const dbRoomByCode = new Map(dbRooms.map((r) => [roomCode(r.block.name, r.number), r]))

  let roomsNew = 0
  let roomsChanged = 0
  let reservedRooms = 0
  for (const room of rooms) {
    const db = dbRoomByCode.get(room.code)
    if (!db) roomsNew++
    else if (db.type !== room.type || db.status !== effectiveRoomStatus(room)) roomsChanged++
    if (room.reservedBeds > 0) reservedRooms++
  }

  return {
    intakeName: intake?.name ?? null,
    studentsInSheet: sheetStudents.size,
    toAdd,
    toMove,
    toRelease,
    unchanged,
    roomsTotal: rooms.length,
    roomsNew,
    roomsChanged,
    reservedRooms,
  }
}

/** Apply a sheet to the active intake: add / move / release students, reconcile rooms. */
export async function runApplySync(csvText: string): Promise<SyncResult> {
  try {
    const { rooms, sheetStudents } = buildSyncModel(csvText)
    const { intake, students } = await loadActiveStudents()
    if (!intake) return { ok: false, error: "No active intake — import a list first." }

    // Safety net: a sheet that parses to zero students (wrong tab, unreadable
    // ROOM/NO.MATRIK columns, an Office file whose numbers came back as "101.0")
    // would otherwise release EVERY bed. Refuse instead of wiping the intake.
    if (sheetStudents.size === 0) {
      return {
        ok: false,
        error:
          "The sheet has no readable student rows — check the tab name and that the BLOCK / ROOM / NO.MATRIK / NAME columns are present. Nothing was changed.",
      }
    }

    const byMatric = new Map<string, { id: string; bed: BedRoomRef }>(
      students.map((s) => [s.matricId, { id: s.id, bed: s.bed }]),
    )

    let added = 0
    let moved = 0
    for (const room of rooms) {
      for (const student of room.students) {
        const db = byMatric.get(student.matricId)
        if (!db) {
          added++
          continue
        }
        const from = bedRoomCode(db.bed)
        if (from && from !== room.code) moved++
      }
    }
    const released = students.filter((s) => !sheetStudents.has(s.matricId) && s.bed).length

    let roomsSynced = 0
    await prisma.$transaction(async (tx) => {
      const existingRooms = await tx.residenceRoom.findMany({
        where: { deletedAt: null },
        select: { id: true, number: true, type: true, block: { select: { name: true } } },
      })
      const dbRoomByCode = new Map(existingRooms.map((r) => [roomCode(r.block.name, r.number), r]))

      // A student whose room is unchanged keeps their bed AND their selectedAt —
      // only their profile fields are refreshed. A room whose TYPE is changing
      // must be emptied, so its occupants are re-placed (and re-stamped).
      const unchanged = new Set<string>()
      for (const room of rooms) {
        const dbRoom = dbRoomByCode.get(room.code)
        const typeChanging = dbRoom != null && dbRoom.type !== room.type
        for (const student of room.students) {
          const db = byMatric.get(student.matricId)
          if (db && bedRoomCode(db.bed) === room.code && !typeChanging) unchanged.add(student.matricId)
        }
      }

      // Pass 1 — release only the beds of students who are moving / leaving (or
      // in a type-changing room), so cross-room moves never collide on the
      // unique occupant id while unchanged students keep their seat.
      const clearIds = students.filter((s) => s.bed && !unchanged.has(s.matricId)).map((s) => s.id)
      if (clearIds.length > 0) {
        await tx.bed.updateMany({ where: { occupantId: { in: clearIds } }, data: { occupantId: null } })
      }
      const sheetCodes = new Set(rooms.map((r) => r.code))
      const sheetRoomIds = existingRooms
        .filter((r) => sheetCodes.has(roomCode(r.block.name, r.number)))
        .map((r) => r.id)
      if (sheetRoomIds.length > 0) {
        await tx.bed.updateMany({ where: { roomId: { in: sheetRoomIds } }, data: { reserved: false } })
      }

      // Pass 2 — rebuild every room and place the sheet's students.
      for (const room of rooms) {
        const parsed = parseRoomNumber(room.block, room.code)
        if (!parsed) throw new Error(`Room "${room.code}" doesn't look like a room number (block · floor · 2-digit room)`)
        const gender = blockGender(room.block)
        if (!gender) throw new Error(`Unknown block "${room.block}" — add it to BLOCK_GENDER_MAP first`)
        const status = effectiveRoomStatus(room)

        const block = await ensureBlock(tx, room.block, gender, parsed.floor)
        const roomId = await ensureRoom(tx, block.id, { code: room.code, type: room.type, status }, parsed.floor)
        roomsSynced++

        for (const student of room.students) {
          let target = byMatric.get(student.matricId)
          if (target) {
            await tx.eligibleStudent.update({
              where: { id: target.id },
              data: {
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
          } else {
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
            target = { id: created.id, bed: null }
            byMatric.set(student.matricId, target)
          }
          // Unchanged students keep their bed (and selectedAt) — no re-claim.
          if (unchanged.has(student.matricId)) continue
          await claimBed(tx, roomId, target.id, room.code)
        }

        if (room.reservedBeds > 0) await markReservedBeds(tx, roomId, room.reservedBeds)
      }

      // Students no longer anywhere in the sheet lose their bed (record kept).
      for (const student of students) {
        if (sheetStudents.has(student.matricId) || !student.bed) continue
        await tx.eligibleStudent.update({ where: { id: student.id }, data: { selectedAt: null } })
      }
    }, { timeout: 120_000, maxWait: 15_000 })

    return { ok: true, added, moved, released, roomsSynced }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" }
  }
}

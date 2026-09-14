import type { PrismaClient } from "@/app/generated/prisma/client"
import { nowMalaysia, type RoomStatus, type RoomType } from "@/lib/room-selection"

/**
 * Shared room/bed mutation helpers used by the accommodation import AND sync.
 * Kept out of the server-action file so they are plain, testable functions.
 */

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$use" | "$extends">

export function bedPriority(position: string): number {
  return position === "left" ? 0 : position === "right" ? 1 : 2
}

/** Find-or-create a block with the given gender; grow its floor count to fit. */
export async function ensureBlock(tx: Tx, name: string, gender: "male" | "female", floor: number) {
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

/** Ensure a room has exactly the beds its type needs (single → 1, double → 2). */
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
  // Soft-delete stray beds (e.g. a former twin) that have no occupant/reserve.
  for (const bed of current) {
    if (!wanted.includes(bed.position) && !bed.occupantId && !bed.reserved && !bed.deletedAt) {
      await tx.bed.update({ where: { id: bed.id }, data: { deletedAt: nowMalaysia() } })
    }
  }
}

/**
 * Find-or-create a room with the file's type (single/double) and status, then
 * make sure its beds match the type. Returns the room id.
 */
export async function ensureRoom(
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

/** Claim the first free, non-reserved bed in a room (twins left → right). */
export async function claimBed(tx: Tx, roomId: string, studentId: string, code: string): Promise<void> {
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
export async function markReservedBeds(tx: Tx, roomId: string, count: number): Promise<void> {
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

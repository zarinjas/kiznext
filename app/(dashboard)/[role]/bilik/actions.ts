"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { nowMalaysia, windowState, canSelect } from "@/lib/room-selection"
import { buildPickerState, getActiveWindow, resolveEligibleStudent } from "@/lib/bilik"
import type { PickerState } from "@/components/shared/bilik/types"

/** Re-fetch the picker payload (used by the 5s poll and after mutations). */
export async function refreshPickerState(): Promise<PickerState> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["ahli"])
  return buildPickerState(session.user.id, session.user.matricId)
}

async function assertOpenWindow() {
  const win = await getActiveWindow()
  if (!win) throw new Error("Selection window is not configured")
  const ws = windowState(
    { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
    nowMalaysia(),
  )
  if (!canSelect(ws)) throw new Error("Selection window is closed")
  return ws
}

/**
 * Select a bed. Server-side re-checks: window open, eligible, gender match, and
 * the bed is free — using a conditional update so two racing students can't both
 * win the last bed. Any previously held bed is released in the same transaction.
 */
export async function selectBed(bedId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }
  if (session.user.role !== "ahli") return { ok: false, error: "Only students can pick a room" }

  try {
    await assertOpenWindow()

    const student = await resolveEligibleStudent(session.user.id, session.user.matricId)
    if (!student) return { ok: false, error: "You're not on the accepted list" }

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, deletedAt: null },
      include: { room: { include: { block: true } } },
    })
    if (!bed) return { ok: false, error: "That bed no longer exists" }
    if (bed.room.status !== "available") return { ok: false, error: "That room isn't available" }
    if (bed.room.block.gender !== student.gender) {
      return { ok: false, error: "That block isn't for your gender" }
    }

    await prisma.$transaction(async (tx) => {
      // Release any bed the student currently holds.
      await tx.bed.updateMany({
        where: { occupantId: student.id },
        data: { occupantId: null },
      })

      // Claim the target bed only if still free (race-safe).
      const claimed = await tx.bed.updateMany({
        where: { id: bedId, occupantId: null, deletedAt: null },
        data: { occupantId: student.id },
      })
      if (claimed.count === 0) {
        throw new Error("That bed was just taken — pick another")
      }

      await tx.eligibleStudent.update({
        where: { id: student.id },
        data: { selectedAt: nowMalaysia(), assignedByAdmin: false },
      })

      // Keep the User's denormalised block/room in sync for the eCard etc.
      await tx.user.update({
        where: { id: session.user.id },
        data: { block: bed.room.block.name, roomNumber: bed.room.number },
      })
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to select bed" }
  }
}

/** Release the student's current bed while the window is open. */
export async function releaseBed(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" }
  if (session.user.role !== "ahli") return { ok: false, error: "Only students can release a room" }

  try {
    await assertOpenWindow()
    const student = await resolveEligibleStudent(session.user.id, session.user.matricId)
    if (!student) return { ok: false, error: "You're not on the accepted list" }

    await prisma.$transaction(async (tx) => {
      await tx.bed.updateMany({ where: { occupantId: student.id }, data: { occupantId: null } })
      await tx.eligibleStudent.update({
        where: { id: student.id },
        data: { selectedAt: null },
      })
      await tx.user.update({
        where: { id: session.user.id },
        data: { block: null, roomNumber: null },
      })
    })

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to release bed" }
  }
}

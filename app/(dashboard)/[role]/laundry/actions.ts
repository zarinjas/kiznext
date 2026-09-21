"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireRole, type Role } from "@/lib/rbac"
import { nowMalaysia } from "@/lib/timezone"
import { getLaundrySnapshot } from "@/lib/laundry"
import { isValidDuration, type LaundrySnapshot } from "@/lib/laundry-meta"

async function requireStudent() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["ahli"])
  return session
}

/** Polled by the member client so machine states stay fresh. */
export async function getLaundrySnapshotAction(): Promise<LaundrySnapshot> {
  const session = await requireStudent()
  return getLaundrySnapshot(session.user.id)
}

/**
 * Start a reminder on a machine. A newer reminder replaces whatever is running
 * on that machine (residents opted for overwrite over queueing), and a student
 * only ever holds one active reminder — any other is closed as `superseded`.
 */
export async function setLaundryReminder(machineId: string, durationMinutes: number) {
  const session = await requireStudent()

  const machine = await prisma.laundryMachine.findFirst({
    where: { id: machineId, deletedAt: null },
  })
  if (!machine) throw new Error("That machine no longer exists.")
  if (machine.status === "out_of_service") throw new Error("That machine is out of service right now.")
  if (!isValidDuration(durationMinutes)) {
    throw new Error("Pick a cycle length between 15 and 180 minutes.")
  }

  const now = nowMalaysia()
  const endsAt = new Date(now.getTime() + durationMinutes * 60_000)

  await prisma.$transaction([
    prisma.laundryReminder.updateMany({
      where: { machineId, deletedAt: null, endedAt: null },
      data: { endedAt: now, endedReason: "superseded" },
    }),
    prisma.laundryReminder.updateMany({
      where: { userId: session.user.id, deletedAt: null, endedAt: null },
      data: { endedAt: now, endedReason: "superseded" },
    }),
    prisma.laundryReminder.create({
      data: {
        machineId,
        userId: session.user.id,
        durationMinutes,
        startedAt: now,
        endsAt,
      },
    }),
  ])

  revalidatePath(`/${session.user.role}/laundry`)
}

/** Cancel the student's own reminder (soft-end; the row stays for history). */
export async function cancelLaundryReminder(reminderId: string) {
  const session = await requireStudent()

  const reminder = await prisma.laundryReminder.findFirst({
    where: { id: reminderId, userId: session.user.id, deletedAt: null },
  })
  if (!reminder) throw new Error("Reminder not found.")
  if (reminder.endedAt) return

  await prisma.laundryReminder.update({
    where: { id: reminder.id },
    data: { endedAt: nowMalaysia(), endedReason: "cancelled" },
  })

  revalidatePath(`/${session.user.role}/laundry`)
}

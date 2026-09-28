"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requireRole, type Role } from "@/lib/rbac"
import {
  cancelLaundryReminder as cancelReminderCore,
  getLaundrySnapshot,
  startLaundryReminder as startReminderCore,
} from "@/lib/laundry"
import type { LaundrySnapshot } from "@/lib/laundry-meta"

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
  await startReminderCore(session.user.id, machineId, durationMinutes)
  revalidatePath(`/${session.user.role}/laundry`)
}

/** Cancel the student's own reminder (soft-end; the row stays for history). */
export async function cancelLaundryReminder(reminderId: string) {
  const session = await requireStudent()
  await cancelReminderCore(session.user.id, reminderId)
  revalidatePath(`/${session.user.role}/laundry`)
}

import { prisma } from "@/lib/db"
import { getAppSetting } from "@/lib/settings"
import { nowMalaysia } from "@/lib/timezone"
import {
  LAUNDRY_DEFAULT_GRACE_MINUTES,
  deriveMachineState,
  isValidDuration,
  type LaundryMachineView,
  type LaundryReminderView,
  type LaundrySnapshot,
} from "@/lib/laundry-meta"

/**
 * Server-only laundry data layer. The pure types/derivation live in
 * `lib/laundry-meta.ts`; this file owns the DB reads and the AppSetting read.
 */

/** Grace window (minutes) after a timer ends before the machine resets. */
export async function getLaundryGraceMinutes(): Promise<number> {
  const raw = await getAppSetting("laundry_timer_grace_minutes")
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : LAUNDRY_DEFAULT_GRACE_MINUTES
}

/** Shared fallback photo for machines without their own image. */
export async function getLaundryDefaultImage(): Promise<string | null> {
  const raw = await getAppSetting("laundry_default_image")
  return raw && raw.trim() ? raw : null
}

export async function getLaundrySnapshot(userId: string): Promise<LaundrySnapshot> {
  const now = nowMalaysia()
  const nowMs = now.getTime()
  const [graceMinutes, defaultImageUrl] = await Promise.all([
    getLaundryGraceMinutes(),
    getLaundryDefaultImage(),
  ])
  const graceMs = graceMinutes * 60_000

  const machines = await prisma.laundryMachine.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  const machineIds = machines.map((m) => m.id)
  const [machineReminders, mine] = await Promise.all([
    machineIds.length
      ? prisma.laundryReminder.findMany({
          where: { machineId: { in: machineIds }, deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.laundryReminder.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { machine: { select: { name: true } } },
    }),
  ])

  // Latest reminder per machine (list is already newest-first).
  const latestByMachine = new Map<string, (typeof machineReminders)[number]>()
  for (const r of machineReminders) {
    if (!latestByMachine.has(r.machineId)) latestByMachine.set(r.machineId, r)
  }

  const machineViews: LaundryMachineView[] = machines.map((m) => {
    const latest = latestByMachine.get(m.id) ?? null
    const outOfService = m.status === "out_of_service"
    const state = deriveMachineState({ outOfService }, latest, nowMs, graceMs)
    const showReminder = state === "laundry_active" || state === "timer_ended"

    return {
      id: m.id,
      name: m.name,
      location: m.location,
      imageUrl: m.imageUrl,
      outOfService,
      sortOrder: m.sortOrder,
      state,
      reminder:
        showReminder && latest
          ? {
              id: latest.id,
              userId: latest.userId,
              userName: latest.user.name,
              durationMinutes: latest.durationMinutes,
              startedAt: latest.startedAt.toISOString(),
              endsAt: latest.endsAt.toISOString(),
              mine: latest.userId === userId,
            }
          : null,
    }
  })

  const history: LaundryReminderView[] = mine.map((r) => ({
    id: r.id,
    machineId: r.machineId,
    machineName: r.machine.name,
    durationMinutes: r.durationMinutes,
    startedAt: r.startedAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    endedAt: r.endedAt ? r.endedAt.toISOString() : null,
    endedReason: r.endedReason,
  }))

  const myActive =
    history.find((r) => !r.endedAt && new Date(r.endsAt).getTime() > nowMs) ?? null

  return {
    machines: machineViews,
    myActive,
    myHistory: history,
    defaultImageUrl,
    graceMinutes,
    serverNow: now.toISOString(),
  }
}

/**
 * Start a reminder on a machine for a user. A newer reminder replaces whatever
 * is running on that machine (residents opted for overwrite over queueing), and
 * a resident only ever holds one active reminder — any other is closed as
 * `superseded`. Shared by the web Server Action and the mobile API route.
 */
export async function startLaundryReminder(
  userId: string,
  machineId: string,
  durationMinutes: number,
): Promise<void> {
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
      where: { userId, deletedAt: null, endedAt: null },
      data: { endedAt: now, endedReason: "superseded" },
    }),
    prisma.laundryReminder.create({
      data: { machineId, userId, durationMinutes, startedAt: now, endsAt },
    }),
  ])
}

/** Cancel a resident's own reminder (soft-end; the row stays for history). */
export async function cancelLaundryReminder(userId: string, reminderId: string): Promise<void> {
  const reminder = await prisma.laundryReminder.findFirst({
    where: { id: reminderId, userId, deletedAt: null },
  })
  if (!reminder) throw new Error("Reminder not found.")
  if (reminder.endedAt) return

  await prisma.laundryReminder.update({
    where: { id: reminder.id },
    data: { endedAt: nowMalaysia(), endedReason: "cancelled" },
  })
}

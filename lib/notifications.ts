import { prisma } from "@/lib/db"
import type { Role } from "@/lib/rbac"
import { sendBroadcastEmails } from "@/lib/email"
import { formatMalaysia } from "@/lib/timezone"
import {
  parseChannels,
  type NotificationAdminRow,
  type NotificationAudience,
  type NotificationChannel,
  type NotificationUserOption,
  type NotificationView,
} from "@/lib/notification-meta"

/**
 * Broadcast notifications — server-side core.
 *
 * This is a plain server-only module (no `use server` directive): every
 * function takes explicit ids and is called from server components, API routes,
 * or the `use server` action wrappers. Client components must import the
 * wrappers instead, never this file.
 *
 * Delivery has three channels, all optional and independent:
 *   • in_app — a `NotificationRecipient` row (the bell / mobile list).
 *   • push   — the Expo Push Service, which fans out to APNs (iOS) and FCM
 *              (Android). We POST to Expo directly with `fetch`, so no SDK /
 *              extra dependency is needed.
 *   • email  — Resend (see `lib/email.ts`), batched 100 per call.
 */

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"
const EXPO_BATCH_SIZE = 100

export interface SendNotificationInput {
  title: string
  body: string
  link?: string | null
  audience: NotificationAudience
  audienceRole?: Role | null
  selectedUserIds?: string[]
  channels: NotificationChannel[]
}

export interface SendNotificationResult {
  recipientCount: number
  pushSentCount: number
  emailSentCount: number
  failedCount: number
}

// ── Recipient resolution ─────────────────────────────────────────────────────

interface ResolvedRecipient {
  id: string
  name: string
  email: string | null
}

async function resolveRecipients(input: SendNotificationInput): Promise<ResolvedRecipient[]> {
  if (input.audience === "role" && !input.audienceRole) {
    throw new Error("Pick a role for this notification.")
  }
  if (input.audience === "selected" && (input.selectedUserIds ?? []).length === 0) {
    throw new Error("Pick at least one person to notify.")
  }

  const where =
    input.audience === "all"
      ? { deletedAt: null, accountStatus: "active" as const }
      : input.audience === "role"
        ? { deletedAt: null, accountStatus: "active" as const, role: input.audienceRole as Role }
        : { deletedAt: null, accountStatus: "active" as const, id: { in: input.selectedUserIds } }

  return prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}

// ── Push (Expo Push Service) ─────────────────────────────────────────────────

interface ExpoTicket {
  status: "ok" | "error"
  id?: string
  message?: string
  details?: { error?: string }
}

interface PushMessage {
  to: string
  title: string
  body: string
  link: string | null
}

async function sendExpoPush(messages: PushMessage[]): Promise<ExpoTicket[]> {
  const tickets: ExpoTicket[] = []

  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const chunk = messages.slice(i, i + EXPO_BATCH_SIZE)
    const payload = chunk.map((m) => ({
      to: m.to,
      title: m.title,
      body: m.body,
      sound: "default",
      priority: "high",
      channelId: "default",
      data: m.link ? { link: m.link } : {},
    }))

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }
    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`
    }

    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => null)) as
        | { data?: ExpoTicket | ExpoTicket[]; errors?: { message?: string }[] }
        | null
      if (!res.ok || !json) {
        const message = json?.errors?.[0]?.message ?? `Push service returned ${res.status}`
        for (let j = 0; j < chunk.length; j++) tickets.push({ status: "error", message })
        continue
      }
      const data = json.data
      const arr = Array.isArray(data) ? data : data ? [data] : []
      for (let j = 0; j < chunk.length; j++) {
        tickets.push(arr[j] ?? { status: "error", message: "No ticket returned" })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Push request failed"
      for (let j = 0; j < chunk.length; j++) tickets.push({ status: "error", message })
    }
  }

  return tickets
}

// ── Send ─────────────────────────────────────────────────────────────────────

/**
 * Create a notification, persist its recipient rows, then fan it out over the
 * requested channels. Never throws for a delivery failure — per-recipient
 * errors are recorded so the admin history can show what went wrong.
 */
export async function sendNotification(
  sentById: string,
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const title = input.title.trim()
  const body = input.body.trim()
  if (!title) throw new Error("Give the notification a title.")
  if (!body) throw new Error("Write a message body.")
  if (input.channels.length === 0) throw new Error("Pick at least one channel.")

  const recipients = await resolveRecipients(input)
  if (recipients.length === 0) throw new Error("No one matches that audience.")

  const link = input.link?.trim() || null
  const channels = parseChannels(input.channels)

  const notification = await prisma.notification.create({
    data: {
      title,
      body,
      link,
      audience: input.audience,
      audienceRole: input.audience === "role" ? (input.audienceRole as Role) : null,
      channels,
      sentById,
      recipientCount: recipients.length,
      recipients: {
        create: recipients.map((r) => ({ userId: r.id })),
      },
    },
    select: { id: true },
  })

  const now = new Date()
  let pushSentCount = 0
  let emailSentCount = 0
  let failedCount = 0

  // ── Push ──────────────────────────────────────────────────────────────────
  if (channels.includes("push")) {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: recipients.map((r) => r.id) }, deletedAt: null },
      select: { token: true, userId: true },
    })

    if (tokens.length > 0) {
      const tickets = await sendExpoPush(
        tokens.map((t) => ({ to: t.token, title, body, link }))
      )

      const invalidTokens: string[] = []
      const okUsers = new Set<string>()
      const errorUsers = new Map<string, string>()

      tokens.forEach((token, index) => {
        const ticket = tickets[index]
        if (ticket?.status === "ok") {
          okUsers.add(token.userId)
        } else {
          errorUsers.set(token.userId, ticket?.message ?? "Push failed")
          if (ticket?.details?.error === "DeviceNotRegistered") invalidTokens.push(token.token)
        }
      })

      if (invalidTokens.length > 0) {
        await prisma.deviceToken.updateMany({
          where: { token: { in: invalidTokens } },
          data: { deletedAt: now },
        })
      }

      for (const userId of okUsers) {
        await prisma.notificationRecipient.updateMany({
          where: { notificationId: notification.id, userId },
          data: { pushedAt: now },
        })
      }
      for (const [userId, message] of errorUsers) {
        if (okUsers.has(userId)) continue
        await prisma.notificationRecipient.updateMany({
          where: { notificationId: notification.id, userId },
          data: { pushError: message },
        })
      }
      pushSentCount = okUsers.size
    }
    // No registered devices at all (missing APNs/FCM credentials or nobody has
    // opened the app yet) is a configuration state, not a per-recipient error —
    // `pushSentCount: 0` surfaces it without inflating `failedCount`. See #13.
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  if (channels.includes("email")) {
    const emailable = recipients.filter((r) => r.email)
    if (emailable.length > 0) {
      const result = await sendBroadcastEmails({
        recipients: emailable.map((r) => ({ to: r.email as string, name: r.name })),
        title,
        body,
        link,
      })

      const byEmail = new Map(recipients.filter((r) => r.email).map((r) => [r.email as string, r.id]))
      for (const email of result.sent) {
        const userId = byEmail.get(email)
        if (userId) {
          await prisma.notificationRecipient.updateMany({
            where: { notificationId: notification.id, userId },
            data: { emailedAt: now },
          })
        }
      }
      for (const failure of result.failed) {
        const userId = byEmail.get(failure.email)
        if (userId) {
          await prisma.notificationRecipient.updateMany({
            where: { notificationId: notification.id, userId },
            data: { emailError: failure.error },
          })
        }
      }
      emailSentCount = result.sent.length
    } else {
      await prisma.notificationRecipient.updateMany({
        where: { notificationId: notification.id },
        data: { emailError: "No email address on file" },
      })
    }
  }

  // ── Tally ─────────────────────────────────────────────────────────────────
  const errored = await prisma.notificationRecipient.count({
    where: {
      notificationId: notification.id,
      OR: [{ pushError: { not: null } }, { emailError: { not: null } }],
    },
  })
  failedCount = errored

  await prisma.notification.update({
    where: { id: notification.id },
    data: { pushSentCount, emailSentCount, failedCount },
  })

  return { recipientCount: recipients.length, pushSentCount, emailSentCount, failedCount }
}

// ── Recipient feed (in-app) ──────────────────────────────────────────────────

export async function listNotificationsForUser(
  userId: string,
  limit = 20
): Promise<NotificationView[]> {
  const rows = await prisma.notificationRecipient.findMany({
    where: { userId, deletedAt: null, notification: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { notification: true },
  })

  return rows.map((row) => ({
    id: row.notificationId,
    title: row.notification.title,
    body: row.notification.body,
    link: row.notification.link,
    createdAt: formatMalaysia(row.notification.createdAt),
    read: Boolean(row.readAt),
  }))
}

export async function unreadCountForUser(userId: string): Promise<number> {
  return prisma.notificationRecipient.count({
    where: { userId, deletedAt: null, readAt: null, notification: { deletedAt: null } },
  })
}

export async function markNotificationReadForUser(userId: string, notificationId: string): Promise<void> {
  await prisma.notificationRecipient.updateMany({
    where: { userId, notificationId, readAt: null, deletedAt: null },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsReadForUser(userId: string): Promise<void> {
  await prisma.notificationRecipient.updateMany({
    where: { userId, readAt: null, deletedAt: null },
    data: { readAt: new Date() },
  })
}

// ── Admin history ────────────────────────────────────────────────────────────

export async function getNotificationAdminData(): Promise<{
  rows: NotificationAdminRow[]
  userOptions: NotificationUserOption[]
}> {
  const [rows, userOptions] = await Promise.all([
    prisma.notification.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { sentBy: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, accountStatus: "active" },
      select: { id: true, name: true, matricId: true, role: true, email: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    rows: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      link: n.link,
      audience: n.audience,
      audienceRole: n.audienceRole,
      channels: parseChannels(n.channels),
      recipientCount: n.recipientCount,
      pushSentCount: n.pushSentCount,
      emailSentCount: n.emailSentCount,
      failedCount: n.failedCount,
      sentByName: n.sentBy.name,
      createdAt: formatMalaysia(n.createdAt),
    })),
    userOptions,
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } })
}

"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { nowMalaysia } from "@/lib/timezone"
import { CHAT_REACTION_EMOJIS, CHAT_REPORT_REASONS, ONLINE_WINDOW_MS } from "@/lib/chat-meta"
import { getResidentRoomLabel } from "@/lib/bilik"
import { getChatSnapshot } from "./chat-data"
import type { ChatSnapshotView, ChatUserProfileView } from "./chat-types"

/**
 * Community-chat server actions: send (with optional reply + attachment),
 * soft-delete (admins), emoji reactions, message reports, and report
 * moderation. Presence is throttled to a heartbeat every 20s.
 */

const PRESENCE_THROTTLE_MS = 20_000

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session
}

/** Throttled presence write — online = viewing the chat page recently. */
export async function touchChatPresence() {
  const session = await requireUser()
  const userId = session.user.id

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSeenAt: true },
  })
  const last = me?.lastSeenAt?.getTime() ?? 0
  if (Date.now() - last < PRESENCE_THROTTLE_MS) return

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  })
}

export interface SendAttachment {
  url: string
  type: string
  name: string
}

export async function sendChatMessage(
  message: string,
  opts: { replyToId?: string | null; attachment?: SendAttachment | null } = {}
) {
  const session = await requireUser()
  const text = message.trim()
  const attachment = opts.attachment

  if (!text && !attachment) return

  if (text && text.length > 4000) throw new Error("Messages are capped at 4,000 characters.")

  if (attachment) {
    if (!attachment.url.startsWith("/uploads/")) throw new Error("Invalid attachment")
    if (!["image", "pdf", "file"].includes(attachment.type)) throw new Error("Invalid attachment type")
    if (!attachment.name || attachment.name.length > 200) throw new Error("Invalid file name")
  }

  await prisma.communityChatMessage.create({
    data: {
      userId: session.user.id,
      message: text,
      replyToId: opts.replyToId || null,
      attachmentUrl: attachment?.url ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentName: attachment?.name ?? null,
    },
  })

  revalidatePath(`/${session.user.role}/chat`)
}

export async function deleteChatMessage(messageId: string) {
  const session = await requireUser()
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.$transaction([
    prisma.communityChatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    }),
    // Reports on a deleted message are moot — close them all.
    prisma.chatMessageReport.updateMany({
      where: { messageId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
  ])

  revalidatePath(`/${session.user.role}/chat`)
}

export async function toggleChatReaction(messageId: string, emoji: string) {
  const session = await requireUser()
  if (!CHAT_REACTION_EMOJIS.includes(emoji)) throw new Error("Unknown reaction")

  const msg = await prisma.communityChatMessage.findFirst({
    where: { id: messageId, deletedAt: null },
    select: { id: true },
  })
  if (!msg) throw new Error("Message not found.")

  const existing = await prisma.chatMessageReaction.findUnique({
    where: { userId_messageId_emoji: { userId: session.user.id, messageId, emoji } },
  })
  const active = Boolean(existing && !existing.deletedAt)

  await prisma.chatMessageReaction.upsert({
    where: { userId_messageId_emoji: { userId: session.user.id, messageId, emoji } },
    update: { deletedAt: active ? nowMalaysia() : null },
    create: { userId: session.user.id, messageId, emoji },
  })

  revalidatePath(`/${session.user.role}/chat`)
}

export async function reportChatMessage(messageId: string, reason: string, note?: string) {
  const session = await requireUser()
  if (!CHAT_REPORT_REASONS.some((r) => r.value === reason)) throw new Error("Unknown report reason")

  const msg = await prisma.communityChatMessage.findFirst({
    where: { id: messageId, deletedAt: null },
    select: { id: true, userId: true },
  })
  if (!msg) throw new Error("Message not found.")
  if (msg.userId === session.user.id) throw new Error("You can't report your own message.")

  // One open report per reporter per message — re-reporting an open report
  // simply refreshes it instead of spamming the queue.
  const existing = await prisma.chatMessageReport.findFirst({
    where: { messageId, reporterId: session.user.id, deletedAt: null },
  })
  if (existing) {
    await prisma.chatMessageReport.update({
      where: { id: existing.id },
      data: { reason, note: note?.trim() || null, deletedAt: null },
    })
  } else {
    await prisma.chatMessageReport.create({
      data: {
        messageId,
        reporterId: session.user.id,
        reason,
        note: note?.trim() || null,
      },
    })
  }

  revalidatePath(`/${session.user.role}/chat`)
}

/** Moderator dismisses a report without deleting the message. */
export async function dismissChatReport(reportId: string) {
  const session = await requireUser()
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.chatMessageReport.update({
    where: { id: reportId },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/chat`)
}

/** Full-room snapshot for the client poll (3s) and the initial page load. */
export async function getChatMessages(): Promise<ChatSnapshotView> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  return getChatSnapshot(session.user.id, session.user.role as string)
}

/**
 * Admin-only profile peek for a message sender. Gate lives here (server-side)
 * so students can never pull another resident's details, even by guessing ids.
 */
export async function getChatUserProfile(userId: string): Promise<ChatUserProfileView> {
  const session = await requireUser()
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      role: true,
      avatarUrl: true,
      matricId: true,
      email: true,
      phone: true,
      accountStatus: true,
      lastSeenAt: true,
      createdAt: true,
    },
  })
  if (!user) throw new Error("User not found.")

  const roomLabel = user.role === "ahli"
    ? await getResidentRoomLabel(user.id, { requirePublished: false })
    : null

  const online = !!user.lastSeenAt && Date.now() - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    matricId: user.matricId,
    email: user.email,
    phone: user.phone,
    roomLabel,
    accountStatus: user.accountStatus,
    online,
    createdAt: user.createdAt.toISOString(),
  }
}

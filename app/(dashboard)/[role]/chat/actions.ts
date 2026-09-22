"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { ONLINE_WINDOW_MS } from "@/lib/chat-meta"
import { getResidentRoomLabel } from "@/lib/bilik"
import {
  deleteChatMessageCore,
  dismissChatReportCore,
  reportChatMessageCore,
  sendChatMessageCore,
  toggleChatReactionCore,
  type ChatSendAttachment,
} from "@/lib/chat"
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

export type SendAttachment = ChatSendAttachment

export async function sendChatMessage(
  message: string,
  opts: { replyToId?: string | null; attachment?: SendAttachment | null } = {}
) {
  const session = await requireUser()
  await sendChatMessageCore(session.user.id, message, opts)
  revalidatePath(`/${session.user.role}/chat`)
}

export async function deleteChatMessage(messageId: string) {
  const session = await requireUser()
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  await deleteChatMessageCore(session.user.id, messageId)
  revalidatePath(`/${session.user.role}/chat`)
}

export async function toggleChatReaction(messageId: string, emoji: string) {
  const session = await requireUser()
  await toggleChatReactionCore(session.user.id, messageId, emoji)
  revalidatePath(`/${session.user.role}/chat`)
}

export async function reportChatMessage(messageId: string, reason: string, note?: string) {
  const session = await requireUser()
  await reportChatMessageCore(session.user.id, messageId, reason, note)
  revalidatePath(`/${session.user.role}/chat`)
}

/** Moderator dismisses a report without deleting the message. */
export async function dismissChatReport(reportId: string) {
  const session = await requireUser()
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  await dismissChatReportCore(reportId)
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

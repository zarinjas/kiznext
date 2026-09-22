import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"
import { CHAT_REACTION_EMOJIS, CHAT_REPORT_REASONS } from "@/lib/chat-meta"

/**
 * Community-chat mutation core. Extracted from the `chat` Server Actions so the
 * web actions and the mobile API route enforce the same rules.
 */

export interface ChatSendAttachment {
  url: string
  type: string
  name: string
}

/** Send a chat message (text and/or one attachment). No-op when both are empty. */
export async function sendChatMessageCore(
  userId: string,
  message: string,
  opts: { replyToId?: string | null; attachment?: ChatSendAttachment | null } = {},
): Promise<void> {
  const text = message.trim()
  const attachment = opts.attachment

  if (!text && !attachment) return

  if (text && text.length > 4000) throw new Error("Messages are capped at 4,000 characters.")

  if (attachment) {
    if (!attachment.url.startsWith("/uploads/")) throw new Error("Invalid attachment")
    if (!["image", "pdf", "file"].includes(attachment.type)) throw new Error("Invalid attachment type")
    if (!attachment.name || attachment.name.length > 200) throw new Error("Invalid file name")
  }

  if (opts.replyToId) {
    const parent = await prisma.communityChatMessage.findFirst({
      where: { id: opts.replyToId, deletedAt: null },
      select: { id: true },
    })
    if (!parent) throw new Error("The message you're replying to is gone.")
  }

  await prisma.communityChatMessage.create({
    data: {
      userId,
      message: text,
      replyToId: opts.replyToId || null,
      attachmentUrl: attachment?.url ?? null,
      attachmentType: attachment?.type ?? null,
      attachmentName: attachment?.name ?? null,
    },
  })
}

/** Toggle one of the six curated emoji reactions on a message. */
export async function toggleChatReactionCore(
  userId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  if (!CHAT_REACTION_EMOJIS.includes(emoji)) throw new Error("Unknown reaction")

  const msg = await prisma.communityChatMessage.findFirst({
    where: { id: messageId, deletedAt: null },
    select: { id: true },
  })
  if (!msg) throw new Error("Message not found.")

  const existing = await prisma.chatMessageReaction.findUnique({
    where: { userId_messageId_emoji: { userId, messageId, emoji } },
  })
  const active = Boolean(existing && !existing.deletedAt)

  await prisma.chatMessageReaction.upsert({
    where: { userId_messageId_emoji: { userId, messageId, emoji } },
    update: { deletedAt: active ? nowMalaysia() : null },
    create: { userId, messageId, emoji },
  })
}

/** Soft-delete a message (moderators) and close its open reports. */
export async function deleteChatMessageCore(actorId: string, messageId: string): Promise<void> {
  await prisma.$transaction([
    prisma.communityChatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), deletedBy: actorId },
    }),
    prisma.chatMessageReport.updateMany({
      where: { messageId, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
  ])
}

/** Report a message. One open report per reporter per message (re-report refreshes it). */
export async function reportChatMessageCore(
  reporterId: string,
  messageId: string,
  reason: string,
  note?: string,
): Promise<void> {
  if (!CHAT_REPORT_REASONS.some((r) => r.value === reason)) throw new Error("Unknown report reason")

  const msg = await prisma.communityChatMessage.findFirst({
    where: { id: messageId, deletedAt: null },
    select: { id: true, userId: true },
  })
  if (!msg) throw new Error("Message not found.")
  if (msg.userId === reporterId) throw new Error("You can't report your own message.")

  const existing = await prisma.chatMessageReport.findFirst({
    where: { messageId, reporterId, deletedAt: null },
  })
  if (existing) {
    await prisma.chatMessageReport.update({
      where: { id: existing.id },
      data: { reason, note: note?.trim() || null, deletedAt: null },
    })
  } else {
    await prisma.chatMessageReport.create({
      data: { messageId, reporterId, reason, note: note?.trim() || null },
    })
  }
}

/** Moderator dismisses a report without deleting the message. */
export async function dismissChatReportCore(reportId: string): Promise<void> {
  await prisma.chatMessageReport.update({
    where: { id: reportId },
    data: { deletedAt: new Date() },
  })
}

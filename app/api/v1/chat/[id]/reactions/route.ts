import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { nowMalaysia } from "@/lib/timezone"
import { CHAT_REACTION_EMOJIS } from "@/lib/chat-meta"

export const runtime = "nodejs"

/** Toggle one of the six quick reactions on a chat message. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const body = await req.json().catch(() => null)
  const emoji = typeof body?.emoji === "string" ? body.emoji : ""
  if (!CHAT_REACTION_EMOJIS.includes(emoji)) return badRequest("Unknown reaction.")

  try {
    const msg = await prisma.communityChatMessage.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!msg) return badRequest("Message not found.")

    const existing = await prisma.chatMessageReaction.findUnique({
      where: { userId_messageId_emoji: { userId: auth.user.id, messageId: id, emoji } },
    })
    const active = Boolean(existing && !existing.deletedAt)

    await prisma.chatMessageReaction.upsert({
      where: { userId_messageId_emoji: { userId: auth.user.id, messageId: id, emoji } },
      update: { deletedAt: active ? nowMalaysia() : null },
      create: { userId: auth.user.id, messageId: id, emoji },
    })

    return NextResponse.json({ data: { ok: true, active: !active } })
  } catch (err) {
    console.error("[api/v1/chat/:id/reactions] failed", err)
    return serverError("Couldn't update the reaction.")
  }
}

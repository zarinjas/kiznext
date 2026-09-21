import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { getChatSnapshot } from "@/app/(dashboard)/[role]/chat/chat-data"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PRESENCE_THROTTLE_MS = 20_000

/**
 * Community-chat snapshot for the client poll. Also bumps the caller's presence
 * heartbeat (throttled) so the online count stays meaningful.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const me = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { lastSeenAt: true },
    })
    if (Date.now() - (me?.lastSeenAt?.getTime() ?? 0) > PRESENCE_THROTTLE_MS) {
      await prisma.user.update({ where: { id: auth.user.id }, data: { lastSeenAt: new Date() } })
    }

    const snapshot = await getChatSnapshot(auth.user.id, auth.user.role)
    return NextResponse.json({ data: { chat: snapshot } })
  } catch (err) {
    console.error("[api/v1/chat] failed", err)
    return serverError("Couldn't load the chat.")
  }
}

/** Send a chat message (text only for Phase 1 — attachments come later). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const replyToId = typeof body?.replyToId === "string" ? body.replyToId : null

  if (!message) return badRequest("Type a message first.")
  if (message.length > 4000) return badRequest("Messages are capped at 4,000 characters.")

  try {
    if (replyToId) {
      const parent = await prisma.communityChatMessage.findFirst({
        where: { id: replyToId, deletedAt: null },
        select: { id: true },
      })
      if (!parent) return badRequest("The message you're replying to is gone.")
    }

    await prisma.communityChatMessage.create({
      data: { userId: auth.user.id, message, replyToId },
    })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/chat send] failed", err)
    return serverError("Couldn't send your message.")
  }
}

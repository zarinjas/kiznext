import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { sendChatMessageCore, type ChatSendAttachment } from "@/lib/chat"
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

/**
 * Send a chat message — text and/or one attachment (uploaded first via
 * `/api/v1/upload?dir=chat`). Mirrors the web `sendChatMessage` action.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message : ""
  const replyToId = typeof body?.replyToId === "string" ? body.replyToId : null

  const rawAttachment = body?.attachment
  const attachment: ChatSendAttachment | null =
    rawAttachment &&
    typeof rawAttachment.url === "string" &&
    typeof rawAttachment.type === "string" &&
    typeof rawAttachment.name === "string"
      ? { url: rawAttachment.url, type: rawAttachment.type, name: rawAttachment.name }
      : null

  if (!message.trim() && !attachment) return badRequest("Type a message first.")
  if (message.length > 4000) return badRequest("Messages are capped at 4,000 characters.")

  try {
    await sendChatMessageCore(auth.user.id, message, { replyToId, attachment })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Couldn't send your message."
    console.error("[api/v1/chat send] failed", err)
    return badRequest(msg)
  }
}

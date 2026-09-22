import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, badRequest } from "@/lib/mobile-auth"
import { reportChatMessageCore } from "@/lib/chat"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Report a chat message for moderation. Moderators act on it in the web admin. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const body = await req.json().catch(() => null)
  const reason = typeof body?.reason === "string" ? body.reason : ""
  const note = typeof body?.note === "string" ? body.note : undefined

  if (!reason) return badRequest("Pick a reason for the report.")

  try {
    await reportChatMessageCore(auth.user.id, id, reason, note)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't send the report."
    console.error("[api/v1/chat report] failed", err)
    return badRequest(message)
  }
}

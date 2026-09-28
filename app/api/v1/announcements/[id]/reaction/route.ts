import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, forbidden, badRequest } from "@/lib/mobile-auth"
import { toggleAnnouncementReaction } from "@/lib/announcements"
import { ANNOUNCEMENT_REACTIONS, type AnnouncementReactionType } from "@/lib/announcement-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MEMBER_ROLES = ["ahli", "staf", "fellow"]

/** Toggle a reaction (noted / excited / interested) on an announcement. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!MEMBER_ROLES.includes(auth.user.role)) return forbidden("Only residents can react to announcements.")

  const { id } = await params
  const body = await req.json().catch(() => null)
  const type = body?.type as AnnouncementReactionType

  if (!ANNOUNCEMENT_REACTIONS.some((r) => r.type === type)) return badRequest("Unknown reaction.")

  try {
    await toggleAnnouncementReaction(auth.user.id, id, type)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't save your reaction."
    console.error("[api/v1/announcements reaction] failed", err)
    return badRequest(message)
  }
}

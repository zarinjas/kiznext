import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, forbidden, badRequest } from "@/lib/mobile-auth"
import { markAnnouncementRead } from "@/lib/announcements"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MEMBER_ROLES = ["ahli", "staf", "fellow"]

/** Mark an announcement as read (clears the "New" pill on the mobile feed). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!MEMBER_ROLES.includes(auth.user.role)) return forbidden("Only residents can mark announcements read.")

  const { id } = await params

  try {
    await markAnnouncementRead(auth.user.id, id)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't mark it read."
    console.error("[api/v1/announcements read] failed", err)
    return badRequest(message)
  }
}

import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { getAnnouncementFeed } from "@/lib/announcements"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MEMBER_ROLES = ["ahli", "staf", "fellow"]

/**
 * Announcement feed — pinned first then newest, with reaction counts and (for
 * members) the caller's own reactions + unread state, so the mobile cards match
 * the web feed. Dates are ISO strings rendered in Asia/Kuala_Lumpur client-side.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const isMember = MEMBER_ROLES.includes(auth.user.role)
    const feed = await getAnnouncementFeed(auth.user.id, isMember)

    return NextResponse.json({
      data: {
        announcements: feed.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          tag: a.tag,
          isPinned: a.isPinned,
          attachmentUrl: a.attachmentUrl,
          attachmentType: a.attachmentType,
          posterName: a.posterName,
          scheduledAt: a.scheduledAt?.toISOString() ?? null,
          expiresAt: a.expiresAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
          reactions: a.reactions,
          mine: a.mine,
          unread: a.unread,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/announcements] failed", err)
    return serverError("Couldn't load announcements.")
  }
}

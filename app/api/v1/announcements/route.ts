import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Announcement feed — same query as the web `pengumuman` page: every
 * non-deleted post, pinned first then newest. Dates are returned as ISO strings
 * and rendered in Asia/Kuala_Lumpur by the client.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 100,
  })

  return NextResponse.json({
    data: {
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        tag: a.tag,
        isPinned: a.isPinned,
        attachmentUrl: a.attachmentUrl,
        attachmentType: a.attachmentType,
        posterName: a.poster?.name ?? null,
        scheduledAt: a.scheduledAt?.toISOString() ?? null,
        expiresAt: a.expiresAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    },
  })
}

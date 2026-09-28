import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { formatFileSize } from "@/lib/guide-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Digital Guide library — published guides with the reader's "new" state. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const guides = await prisma.guide.findMany({
      where: { deletedAt: null, published: true },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        reads: { where: { userId: auth.user.id, deletedAt: null }, select: { id: true } },
      },
    })

    return NextResponse.json({
      data: {
        guides: guides.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          coverImage: g.coverImage,
          fileUrl: g.fileUrl,
          pageCount: g.pageCount,
          isPinned: g.isPinned,
          isNew: g.reads.length === 0,
          sizeLabel: formatFileSize(g.fileSize),
          displayDate: new Intl.DateTimeFormat("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            dateStyle: "medium",
          }).format(g.createdAt),
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/guides] failed", err)
    return serverError("Couldn't load the Digital Guide.")
  }
}

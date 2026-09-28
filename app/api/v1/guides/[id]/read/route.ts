import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/** Mark a guide as read by the signed-in user (drives the "New" badge). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params
  if (!id) return badRequest("Missing guide id.")

  try {
    const guide = await prisma.guide.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    })
    if (!guide) return badRequest("Guide not found.")

    await prisma.guideRead.upsert({
      where: { guideId_userId: { guideId: id, userId: auth.user.id } },
      create: { guideId: id, userId: auth.user.id },
      update: { deletedAt: null },
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/guides/read] failed", err)
    return serverError("Couldn't mark the guide as read.")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/** Mark your own found item as claimed. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params

  try {
    const item = await prisma.lostFoundItem.findFirst({ where: { id, deletedAt: null } })
    if (!item) return badRequest("Item not found.")
    if (item.reportedBy !== auth.user.id) return badRequest("Only the reporter can mark this claimed.")

    await prisma.lostFoundItem.update({ where: { id }, data: { status: "claimed" } })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/lost-found/claim] failed", err)
    return serverError("Couldn't update the item.")
  }
}

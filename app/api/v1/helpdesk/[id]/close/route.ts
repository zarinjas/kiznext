import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/** Close your own helpdesk request. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params

  try {
    await prisma.helpdeskTicket.updateMany({
      where: { id, userId: auth.user.id, deletedAt: null },
      data: { status: "closed" },
    })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/helpdesk/:id/close] failed", err)
    return serverError("Couldn't close this request.")
  }
}

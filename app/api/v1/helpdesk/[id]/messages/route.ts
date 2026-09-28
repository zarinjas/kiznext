import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { translateLiveMessage } from "@/lib/helpdesk-translate"
import { SUPPORT_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"

/** Reply on a helpdesk thread. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const body = await req.json().catch(() => null)
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  if (!message) return badRequest("Type a message first.")

  try {
    const ticket = await prisma.helpdeskTicket.findUnique({ where: { id } })
    if (!ticket || ticket.deletedAt) return badRequest("Ticket not found.")

    const isStaff = SUPPORT_ROLES.includes(auth.user.role)
    if (!isStaff && ticket.userId !== auth.user.id) return forbidden()
    if (ticket.status === "closed") return badRequest("This request is closed.")

    const created = await prisma.helpdeskMessage.create({
      data: { ticketId: id, senderId: auth.user.id, message },
    })

    if (ticket.channel === "live") translateLiveMessage(created.id, message)

    if (ticket.status === "resolved" || ticket.status === "more_info_required") {
      await prisma.helpdeskTicket.update({ where: { id }, data: { status: "in_progress" } })
    }

    return NextResponse.json({ data: { ok: true, id: created.id } })
  } catch (err) {
    console.error("[api/v1/helpdesk/:id/messages] failed", err)
    return serverError("Couldn't send your message.")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { SUPPORT_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"

type Action = "assign" | "resolve" | "close" | "reopen" | "more_info"

/** Support-desk ticket lifecycle: take / resolve / close / reopen / ask for info. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!SUPPORT_ROLES.includes(auth.user.role)) return forbidden("Support desk only.")

  const { id } = await params
  const body = await req.json().catch(() => null)
  const action = body?.action as Action
  if (!["assign", "resolve", "close", "reopen", "more_info"].includes(action)) {
    return badRequest("Unknown action.")
  }

  try {
    const ticket = await prisma.helpdeskTicket.findUnique({ where: { id } })
    if (!ticket || ticket.deletedAt) return badRequest("Ticket not found.")

    if (action === "assign") {
      await prisma.helpdeskTicket.update({
        where: { id },
        data: { assignedTo: auth.user.id, status: "in_progress" },
      })
    } else if (action === "resolve") {
      await prisma.helpdeskTicket.update({ where: { id }, data: { status: "resolved" } })
      await prisma.helpdeskMessage.create({
        data: {
          ticketId: id,
          senderId: auth.user.id,
          message:
            "I've marked this ticket as resolved. If anything's still not right, just reply and it will reopen automatically.",
          isAutoReply: true,
        },
      })
    } else if (action === "close") {
      await prisma.helpdeskTicket.update({ where: { id }, data: { status: "closed" } })
    } else if (action === "reopen") {
      await prisma.helpdeskTicket.update({ where: { id }, data: { status: "in_progress" } })
    } else {
      await prisma.helpdeskTicket.update({ where: { id }, data: { status: "more_info_required" } })
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/admin/helpdesk/status] failed", err)
    return serverError("Couldn't update the ticket.")
  }
}

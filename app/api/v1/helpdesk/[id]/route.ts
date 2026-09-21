import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { SUPPORT_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** One helpdesk thread: ticket meta + all messages. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params

  try {
    const ticket = await prisma.helpdeskTicket.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true } } },
    })
    if (!ticket || ticket.deletedAt) return badRequest("Ticket not found.")

    const isStaff = SUPPORT_ROLES.includes(auth.user.role)
    if (!isStaff && ticket.userId !== auth.user.id) return forbidden()

    const messages = await prisma.helpdeskMessage.findMany({
      where: { ticketId: id, deletedAt: null },
      include: { sender: { select: { name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      data: {
        ticket: {
          id: ticket.id,
          displayId: ticket.displayId,
          subject: ticket.subject,
          category: ticket.category,
          channel: ticket.channel,
          status: ticket.status,
          locationBlock: ticket.locationBlock,
          locationDetail: ticket.locationDetail,
          createdAt: ticket.createdAt.toISOString(),
        },
        messages: messages.map((m) => ({
          id: m.id,
          message: m.message,
          sourceLang: m.sourceLang,
          translationEn: m.translationEn,
          translationZh: m.translationZh,
          isAutoReply: m.isAutoReply,
          createdAt: m.createdAt.toISOString(),
          sender: {
            id: m.senderId,
            name: m.sender.name,
            role: m.sender.role,
            avatarUrl: m.sender.avatarUrl,
          },
        })),
        canReply: ticket.status !== "closed",
      },
    })
  } catch (err) {
    console.error("[api/v1/helpdesk/:id] failed", err)
    return serverError("Couldn't load this request.")
  }
}

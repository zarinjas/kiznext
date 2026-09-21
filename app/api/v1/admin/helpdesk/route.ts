import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, serverError } from "@/lib/mobile-auth"
import { SUPPORT_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Support-desk queue — every ticket, newest activity first. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!SUPPORT_ROLES.includes(auth.user.role)) return forbidden("Support desk only.")

  const status = req.nextUrl.searchParams.get("status") ?? "open"

  try {
    const tickets = await prisma.helpdeskTicket.findMany({
      where: {
        deletedAt: null,
        ...(status === "all"
          ? {}
          : status === "closed"
            ? { status: "closed" }
            : { status: { not: "closed" } }),
      },
      include: {
        user: { select: { id: true, name: true, matricId: true, role: true } },
        assignee: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true, role: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    })

    return NextResponse.json({
      data: {
        tickets: tickets.map((t) => ({
          id: t.id,
          displayId: t.displayId,
          subject: t.subject,
          category: t.category,
          channel: t.channel,
          status: t.status,
          origin: t.origin,
          locationBlock: t.locationBlock,
          locationDetail: t.locationDetail,
          updatedAt: t.updatedAt.toISOString(),
          createdAt: t.createdAt.toISOString(),
          userName: t.user.name,
          userMatric: t.user.matricId,
          userRole: t.user.role,
          assignedToName: t.assignee?.name ?? null,
          messageCount: t._count.messages,
          lastMessage: t.messages[0]
            ? {
                message: t.messages[0].message,
                isAutoReply: t.messages[0].isAutoReply,
                senderName: t.messages[0].sender.name,
                senderRole: t.messages[0].sender.role,
              }
            : null,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/admin/helpdesk] failed", err)
    return serverError("Couldn't load the inbox.")
  }
}

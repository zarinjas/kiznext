import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { isOfficeHours, getOfficeHoursMessage } from "@/lib/office-hours"
import { translateLiveMessage } from "@/lib/helpdesk-translate"
import { getResidentRoomDetail } from "@/lib/bilik"
import { SUPPORT_ROLES, type Role } from "@/lib/rbac"
import { HELPDESK_CATEGORIES } from "@/lib/helpdesk-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const CATEGORY_VALUES = HELPDESK_CATEGORIES.map((c) => c.value) as string[]

/** The member helpdesk surface: own tickets, office status, context for a new one. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [tickets, blocks, contacts, room] = await Promise.all([
      prisma.helpdeskTicket.findMany({
        where: { userId: auth.user.id, deletedAt: null },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: { sender: { select: { name: true, role: true } } },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.block.findMany({
        where: { deletedAt: null },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.contentItem.findMany({
        where: { kind: "emergency_contact", deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      getResidentRoomDetail(auth.user.id),
    ])

    const unreadCount = tickets.filter((t) => {
      if (t.status === "closed") return false
      const lastMsg = t.messages[0]
      if (!lastMsg) return false
      const isAdmin = SUPPORT_ROLES.includes(lastMsg.sender.role as Role)
      return isAdmin && !lastMsg.isAutoReply
    }).length

    return NextResponse.json({
      data: {
        tickets: tickets.map((t) => ({
          id: t.id,
          displayId: t.displayId,
          subject: t.subject,
          category: t.category,
          channel: t.channel,
          status: t.status,
          locationBlock: t.locationBlock,
          locationDetail: t.locationDetail,
          updatedAt: t.updatedAt.toISOString(),
          lastMessage: t.messages[0]
            ? {
                message: t.messages[0].message,
                isAutoReply: t.messages[0].isAutoReply,
                senderName: t.messages[0].sender.name,
                senderRole: t.messages[0].sender.role,
              }
            : null,
        })),
        unreadCount,
        officeOpen: isOfficeHours(),
        blocks: blocks.map((b) => b.name),
        defaultBlock: room?.blockName ?? null,
        defaultRoom: room?.roomNumber ?? null,
        emergencyContacts: contacts.map((c) => ({
          id: c.id,
          title: c.title,
          phone: c.phone,
          subtitle: c.subtitle,
          body: c.body,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/helpdesk] failed", err)
    return serverError("Couldn't load helpdesk.")
  }
}

/** Create a support ticket or start a live chat (same thread, lighter lifecycle). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const channel = body?.channel === "live" ? "live" : "ticket"
  const message = typeof body?.message === "string" ? body.message.trim() : ""
  const rawSubject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const category =
    typeof body?.category === "string" && CATEGORY_VALUES.includes(body.category)
      ? body.category
      : "general_enquiry"
  const locationBlock =
    typeof body?.locationBlock === "string" ? body.locationBlock.trim() || null : null
  const locationDetail =
    typeof body?.locationDetail === "string" ? body.locationDetail.trim() || null : null

  const subject = channel === "live" ? message.split("\n")[0].slice(0, 120) : rawSubject

  if (!subject) return badRequest("Give your request a subject.")
  if (channel === "live" && !message) return badRequest("Type your question first.")

  try {
    const ticket = await prisma.helpdeskTicket.create({
      data: {
        userId: auth.user.id,
        subject,
        category: category as never,
        channel: channel as never,
        status: "submitted",
        locationBlock: channel === "live" ? null : locationBlock,
        locationDetail: channel === "live" ? null : locationDetail,
        messages: { create: { senderId: auth.user.id, message: message || subject } },
      },
      include: { messages: true },
    })

    const first = ticket.messages[0]
    if (channel === "live" && first) translateLiveMessage(first.id, message)

    if (!isOfficeHours()) {
      await prisma.helpdeskMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: auth.user.id,
          message: getOfficeHoursMessage(),
          isAutoReply: true,
        },
      })
    }

    return NextResponse.json({ data: { id: ticket.id, displayId: ticket.displayId } })
  } catch (err) {
    console.error("[api/v1/helpdesk create] failed", err)
    return serverError("Couldn't send your request.")
  }
}

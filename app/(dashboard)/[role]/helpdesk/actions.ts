"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { isOfficeHours, getOfficeHoursMessage } from "@/lib/office-hours"
import { translateLiveMessage } from "@/lib/helpdesk-translate"
import { SUPPORT_ROLES, type Role } from "@/lib/rbac"
import type { HelpdeskCategory, HelpdeskChannel } from "@/app/generated/prisma/client"

export interface CreateTicketInput {
  subject: string
  message?: string
  category: HelpdeskCategory
  locationBlock: string | null
  locationDetail: string | null
  channel?: HelpdeskChannel
}

export async function createTicket(input: CreateTicketInput) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const category = input.category ?? "general_enquiry"
  const subject = (input.subject ?? "").trim()
  const message = (input.message ?? "").trim()
  const locationBlock = input.locationBlock?.trim() || null
  const locationDetail = input.locationDetail?.trim() || null

  if (!subject) throw new Error("Subject is required")

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      userId: session.user.id,
      subject,
      category,
      channel: input.channel ?? "ticket",
      status: "submitted",
      locationBlock,
      locationDetail,
      messages: {
        create: {
          senderId: session.user.id,
          message: message || subject,
        },
      },
    },
    include: { messages: true },
  })

  if (!isOfficeHours()) {
    await prisma.helpdeskMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.user.id,
        message: getOfficeHoursMessage(),
        isAutoReply: true,
      },
    })
  }

  revalidatePath(`/${session.user.role}/helpdesk`)
  return ticket.id
}

/**
 * Start a live chat — a quick question with no category form. Same thread and
 * inbox as a ticket, just lighter: the resident types and sends.
 */
export async function startLiveChat(message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const text = (message ?? "").trim()
  if (!text) throw new Error("Type your question first")

  const subject = text.split("\n")[0].slice(0, 120)

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      userId: session.user.id,
      subject,
      category: "general_enquiry",
      channel: "live",
      status: "submitted",
      messages: { create: { senderId: session.user.id, message: text } },
    },
    include: { messages: true },
  })

  // Auto-translate the opening question so the office reads it in English.
  const first = ticket.messages[0]
  if (first) translateLiveMessage(first.id, text)

  if (!isOfficeHours()) {
    await prisma.helpdeskMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session.user.id,
        message: getOfficeHoursMessage(),
        isAutoReply: true,
      },
    })
  }

  revalidatePath(`/${session.user.role}/helpdesk`)
  return ticket.id
}

export async function sendReply(ticketId: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
  })
  if (!ticket || ticket.deletedAt) throw new Error("Ticket not found")
  if (ticket.userId !== session.user.id) throw new Error("Unauthorized")

  const created = await prisma.helpdeskMessage.create({
    data: {
      ticketId,
      senderId: session.user.id,
      message,
    },
  })

  // Live chats are translated both ways; structured tickets stay as typed.
  if (ticket.channel === "live") {
    translateLiveMessage(created.id, message)
  }

  // A reply on a resolved or awaiting-more-info ticket brings it back to life.
  if (ticket.status === "resolved" || ticket.status === "more_info_required") {
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: "in_progress" },
    })
  }

  revalidatePath(`/${session.user.role}/helpdesk/${ticketId}`)
}

export async function closeTicket(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.helpdeskTicket.update({
    where: { id: ticketId, userId: session.user.id },
    data: { status: "closed" },
  })

  revalidatePath(`/${session.user.role}/helpdesk`)
}

export async function getTicketMessages(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
    select: { userId: true },
  })
  if (!ticket) throw new Error("Ticket not found")

  const role = session.user.role as Role
  const isStaff = SUPPORT_ROLES.includes(role)
  if (!isStaff && ticket.userId !== session.user.id) throw new Error("Unauthorized")

  return prisma.helpdeskMessage.findMany({
    where: { ticketId, deletedAt: null },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })
}

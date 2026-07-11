"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { isOfficeHours, getOfficeHoursMessage } from "@/lib/office-hours"

export async function createTicket(subject: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      userId: session.user.id,
      status: "open",
      messages: {
        create: {
          senderId: session.user.id,
          message,
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

export async function sendReply(ticketId: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
  })
  if (!ticket || ticket.deletedAt) throw new Error("Ticket not found")

  await prisma.helpdeskMessage.create({
    data: {
      ticketId,
      senderId: session.user.id,
      message,
    },
  })

  if (!isOfficeHours()) {
    await prisma.helpdeskMessage.create({
      data: {
        ticketId,
        senderId: session.user.id,
        message: getOfficeHoursMessage(),
        isAutoReply: true,
      },
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

  return prisma.helpdeskMessage.findMany({
    where: { ticketId, deletedAt: null },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })
}

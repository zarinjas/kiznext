"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function adminReply(ticketId: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

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

  if (ticket.status === "open") {
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: "in_progress" },
    })
  }

  revalidatePath(`/${session.user.role}/urus-helpdesk/${ticketId}`)
}

export async function assignTicket(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { assignedTo: session.user.id, status: "in_progress" },
  })

  revalidatePath(`/${session.user.role}/urus-helpdesk`)
}

export async function closeTicketAdmin(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { status: "closed" },
  })

  revalidatePath(`/${session.user.role}/urus-helpdesk`)
}

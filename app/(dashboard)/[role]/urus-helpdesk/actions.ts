"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { translateLiveMessage } from "@/lib/helpdesk-translate"
import type { Role } from "@/lib/rbac"

/** New status a ticket moves to once an admin actually engages with it. */
async function ticketStatusAfterReply(status: string): Promise<"in_progress" | null> {
  if (status === "submitted" || status === "under_review") return "in_progress"
  return null
}

export async function adminReply(ticketId: string, message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
  })
  if (!ticket || ticket.deletedAt) throw new Error("Ticket not found")

  const created = await prisma.helpdeskMessage.create({
    data: {
      ticketId,
      senderId: session.user.id,
      message,
    },
  })

  // Live chats are translated both ways so the resident reads the reply in
  // Mandarin; structured tickets stay as typed.
  if (ticket.channel === "live") {
    translateLiveMessage(created.id, message)
  }

  const next = await ticketStatusAfterReply(ticket.status)
  if (next) {
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: next },
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

/** Resolve — used when the issue is fixed or the question is answered. */
export async function resolveTicketAdmin(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
  })
  if (!ticket || ticket.deletedAt) throw new Error("Ticket not found")

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { status: "resolved" },
  })

  await prisma.helpdeskMessage.create({
    data: {
      ticketId,
      senderId: session.user.id,
      message:
        "I've marked this ticket as resolved. If anything's still not right, just reply and it will reopen automatically.",
      isAutoReply: true,
    },
  })

  revalidatePath(`/${session.user.role}/urus-helpdesk`)
  revalidatePath(`/${session.user.role}/urus-helpdesk/${ticketId}`)
}

/** Ask the reporter for more details — the ticket waits on their reply. */
export async function requestMoreInfo(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
  })
  if (!ticket || ticket.deletedAt) throw new Error("Ticket not found")

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { status: "more_info_required" },
  })

  revalidatePath(`/${session.user.role}/urus-helpdesk/${ticketId}`)
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

/** Reopen a resolved (or closed) ticket — pulls it back into the active queue. */
export async function reopenTicketAdmin(ticketId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { status: "in_progress" },
  })

  revalidatePath(`/${session.user.role}/urus-helpdesk`)
  revalidatePath(`/${session.user.role}/urus-helpdesk/${ticketId}`)
}

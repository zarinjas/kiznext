import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { AdminTicketChat } from "./admin-ticket-chat"

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ role: string; ticketId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const { role, ticketId } = await params

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { name: true, matricId: true, block: true, roomNumber: true } },
      messages: {
        where: { deletedAt: null },
        include: { sender: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ticket || ticket.deletedAt) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <a
          href={`/${role}/urus-helpdesk`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </a>
      </div>

      <div className="mb-4 rounded-lg border bg-card p-4">
        <p className="font-medium text-foreground">{ticket.user.name}</p>
        <p className="text-sm text-muted-foreground">
          {ticket.user.matricId}
          {ticket.user.block && ` · ${ticket.user.block}`}
          {ticket.user.roomNumber && ` ${ticket.user.roomNumber}`}
        </p>
      </div>

      <AdminTicketChat
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        messages={ticket.messages}
        role={role}
      />
    </div>
  )
}

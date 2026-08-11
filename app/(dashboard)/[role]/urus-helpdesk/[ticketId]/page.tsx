import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { AdminTicketChat } from "./admin-ticket-chat"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"

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
    <Box sx={{ maxWidth: 780, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1 }}>
        <Link href={`/${role}/urus-helpdesk`} style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<KIcon icon="arrow_back" size={16} />}>
            Back
          </Button>
        </Link>
        <StatusChip status={ticket.status} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.75, mb: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
        <Box sx={{ width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "primary.main", color: "#fff", fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }}>
          {ticket.user.name.trim().charAt(0).toUpperCase()}
        </Box>
        <Box>
          <Box sx={{ fontWeight: 600, fontSize: 14.5 }}>{ticket.user.name}</Box>
          <Box sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {ticket.user.matricId}
            {ticket.user.block && ` · ${ticket.user.block}`}
            {ticket.user.roomNumber && ` ${ticket.user.roomNumber}`}
          </Box>
        </Box>
      </Box>

      <AdminTicketChat
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        messages={ticket.messages}
        role={role}
      />
    </Box>
  )
}

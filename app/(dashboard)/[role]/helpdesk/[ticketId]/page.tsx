import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { TicketChat } from "./ticket-chat"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"

export default async function TicketPage({
  params,
}: {
  params: Promise<{ role: string; ticketId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { role, ticketId } = await params

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        where: { deletedAt: null },
        include: { sender: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ticket || ticket.deletedAt || ticket.userId !== session.user.id) {
    notFound()
  }

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1 }}>
        <Link href={`/${role}/helpdesk`} style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<KIcon icon="arrow_back" size={16} />}>
            Back
          </Button>
        </Link>
        <StatusChip status={ticket.status} />
      </Box>

      <TicketChat
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        messages={ticket.messages}
        role={role}
      />
    </Box>
  )
}

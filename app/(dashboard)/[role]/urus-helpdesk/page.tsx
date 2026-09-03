import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"

export default async function UrusHelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { name: true, matricId: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })

  const openTickets = tickets.filter((t) => t.status !== "closed")
  const closedTickets = tickets.filter((t) => t.status === "closed")
  const role = session.user.role

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Helpdesk inbox"
        subtitle={
          openTickets.length > 0
            ? `${openTickets.length} open ticket${openTickets.length === 1 ? "" : "s"}.`
            : "Reply and manage student support tickets."
        }
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {openTickets.length === 0 ? (
          <KEmpty icon="inbox" title="Inbox zero 🎉" body="No open tickets — nice work!" />
        ) : (
          <ListGroup title={`Open · ${openTickets.length}`}>
            {openTickets.map((ticket) => (
              <ListRow
                key={ticket.id}
                href={`/${role}/urus-helpdesk/${ticket.id}`}
                icon="support_agent"
                title={ticket.user.name}
                subtitle={ticket.messages[0]?.message || "(empty)"}
                trailing={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {ticket.assignee && (
                      <Box
                        sx={{
                          display: { xs: "none", md: "flex" },
                          alignItems: "center",
                          gap: 0.375,
                          color: "text.disabled",
                        }}
                      >
                        <KIcon icon="person" size={14} />
                        <Typography variant="caption">{ticket.assignee.name}</Typography>
                      </Box>
                    )}
                    <StatusChip status={ticket.status} />
                  </Box>
                }
              />
            ))}
          </ListGroup>
        )}

        {closedTickets.length > 0 && (
          <ListGroup title={`Closed · ${closedTickets.length}`}>
            {closedTickets.map((ticket) => (
              <ListRow
                key={ticket.id}
                href={`/${role}/urus-helpdesk/${ticket.id}`}
                icon="history"
                title={ticket.user.name}
                subtitle={ticket.user.matricId}
                trailing={<StatusChip status="closed" />}
              />
            ))}
          </ListGroup>
        )}
      </Box>
    </Box>
  )
}

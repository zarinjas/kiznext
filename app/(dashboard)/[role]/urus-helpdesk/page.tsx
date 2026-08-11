import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

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

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Helpdesk Inbox"
        subtitle="Reply and manage student support tickets."
      />

      {openTickets.length === 0 ? (
        <KEmpty icon="inbox" title="Inbox zero" body="No open tickets. Great job." />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {openTickets.map((ticket) => (
            <Link key={ticket.id} href={`/${session.user.role}/urus-helpdesk/${ticket.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.75,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  "&:hover": { borderColor: color.brand[400] },
                }}
              >
                <Box sx={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: color.brand[50], color: color.brand[700], flexShrink: 0 }}>
                  <KIcon icon="support_agent" size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {ticket.user.name} ({ticket.user.matricId})
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ticket.messages[0]?.message || "(empty)"}
                  </Typography>
                </Box>
                {ticket.assignee && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                    <KIcon icon="person" size={14} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>{ticket.assignee.name}</Typography>
                  </Box>
                )}
                <StatusChip status={ticket.status} />
                <KIcon icon="chevron_right" size={18} sx={{ color: "text.disabled" }} />
              </Box>
            </Link>
          ))}
        </Box>
      )}

      {closedTickets.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif", mb: 1.5 }}>
            Closed ({closedTickets.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {closedTickets.map((ticket) => (
              <Link key={ticket.id} href={`/${session.user.role}/urus-helpdesk/${ticket.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", "&:hover": { borderColor: color.brand[400] } }}>
                  <KIcon icon="support_agent" size={18} sx={{ color: "text.disabled" }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {ticket.user.name} ({ticket.user.matricId})
                    </Typography>
                  </Box>
                  <StatusChip status="closed" />
                </Box>
              </Link>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

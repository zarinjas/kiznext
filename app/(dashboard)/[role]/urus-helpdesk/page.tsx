import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, SUPPORT_ROLES } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { HelpdeskTabs } from "./tabs"
import {
  ticketRef,
  helpdeskCategoryMeta,
  helpdeskLocationLabel,
  isHelpdeskActive,
  isHelpdeskDone,
} from "@/lib/helpdesk-meta"

export default async function UrusHelpdeskPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, SUPPORT_ROLES)

  const { tab } = await searchParams
  const channel = tab === "live" ? "live" : "ticket"

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { deletedAt: null, channel },
    include: {
      user: { select: { name: true, matricId: true } },
      messages: { take: 1, orderBy: { createdAt: "desc" } },
      assignee: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  })

  const activeTickets = tickets.filter((t) => isHelpdeskActive(t.status))
  const doneTickets = tickets.filter((t) => isHelpdeskDone(t.status))
  const awaitingInfo = tickets.filter((t) => t.status === "more_info_required").length
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length
  const closedCount = tickets.filter((t) => t.status === "closed").length
  const role = session.user.role

  const toDoGroup = activeTickets.length > 0 && (
    <ListGroup title={`To do · ${activeTickets.length}`}>
      {activeTickets.map((ticket) => {
        const cat = helpdeskCategoryMeta(ticket.category)
        const location = helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)
        // Prefer the English translation in the inbox preview so the office
        // never sees a raw Mandarin line they can't scan.
        const preview = ticket.messages[0]?.translationEn || ticket.messages[0]?.message
        return (
          <ListRow
            key={ticket.id}
            href={`/${role}/urus-helpdesk/${ticket.id}`}
            icon="support_agent"
            title={ticket.user.name}
            subtitle={
              <>
                <Box component="span" sx={{ fontFamily: "var(--font-mono), monospace" }}>
                  {ticketRef(ticket.displayId)}
                </Box>
                {" · "}
                {cat.label}
                {location ? ` · ${location}` : ""}
                {ticket.origin === "concierge" ? " · via KIZ-AI" : ""}
                {preview ? ` — ${preview}` : ""}
              </>
            }
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
        )
      })}
    </ListGroup>
  )

  const doneGroup = doneTickets.length > 0 && (
    <ListGroup title={`Done · ${doneTickets.length}`}>
      {doneTickets.map((ticket) => {
        const cat = helpdeskCategoryMeta(ticket.category)
        return (
          <ListRow
            key={ticket.id}
            href={`/${role}/urus-helpdesk/${ticket.id}`}
            icon="history"
            title={ticket.user.name}
            subtitle={
              <>
                <Box component="span" sx={{ fontFamily: "var(--font-mono), monospace" }}>
                  {ticketRef(ticket.displayId)}
                </Box>
                {" · "}
                {cat.label}
                {" · "}
                {ticket.user.matricId}
              </>
            }
            trailing={<StatusChip status={ticket.status} />}
          />
        )
      })}
    </ListGroup>
  )

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Helpdesk inbox"
        subtitle={
          activeTickets.length > 0
            ? `${activeTickets.length} ${channel === "live" ? "live chat" : "request"}${activeTickets.length === 1 ? "" : "s"} need${activeTickets.length === 1 ? "s" : ""} your attention.`
            : channel === "live"
              ? "Answer quick questions from residents in real time."
              : "Reply and manage student support requests."
        }
      />

      <HelpdeskTabs role={role} tab={tab} />

      <Bento>
        {/* Status metrics */}
        <BentoItem span={3} spanXs={1}>
          <MetricTile
            label="To do"
            value={activeTickets.length}
            icon="pending_actions"
            emphasis={activeTickets.length > 0}
          />
        </BentoItem>
        <BentoItem span={3} spanXs={1}>
          <MetricTile label="Waiting on student" value={awaitingInfo} icon="more_horiz" />
        </BentoItem>
        <BentoItem span={3} spanXs={1}>
          <MetricTile label="Resolved" value={resolvedCount} icon="check_circle" />
        </BentoItem>
        <BentoItem span={3} spanXs={1}>
          <MetricTile label="Closed" value={closedCount} icon="archive" />
        </BentoItem>

        {activeTickets.length === 0 && doneTickets.length === 0 ? (
          <BentoItem span={12} spanXs={2}>
            <KEmpty icon="inbox" title="Inbox zero 🎉" body="No open requests — nice work!" />
          </BentoItem>
        ) : (
          <>
            {toDoGroup && (
              <BentoItem span={doneGroup ? 8 : 12} spanXs={2}>
                {toDoGroup}
              </BentoItem>
            )}
            {doneGroup && (
              <BentoItem span={activeTickets.length > 0 ? 4 : 12} spanXs={2}>
                {doneGroup}
              </BentoItem>
            )}
          </>
        )}
      </Bento>
    </Box>
  )
}

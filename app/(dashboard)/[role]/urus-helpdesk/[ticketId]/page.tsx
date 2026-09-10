import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { AdminTicketChat } from "./admin-ticket-chat"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Surface } from "@/components/kiz/primitives/list-group"
import { Bento, BentoItem } from "@/components/kiz/patterns/bento"
import { getResidentRoomLabel } from "@/lib/bilik"
import { ticketRef, helpdeskCategoryMeta, helpdeskLocationLabel } from "@/lib/helpdesk-meta"
import { font } from "@/lib/theme"

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
      user: { select: { id: true, name: true, matricId: true, role: true } },
      assignee: { select: { name: true } },
      messages: {
        where: { deletedAt: null },
        include: { sender: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ticket || ticket.deletedAt) notFound()

  // Opening a fresh request flags it as "under review" so the student knows
  // someone has seen it (and it drops out of the top of the admin inbox).
  if (ticket.status === "submitted") {
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: "under_review" },
    })
    ticket.status = "under_review"
  }

  // Admins may see the reporter's allocated room regardless of the publish
  // setting — they have full inventory access anyway.
  const reporterRoom = ticket.user.role === "ahli"
    ? await getResidentRoomLabel(ticket.user.id, { requirePublished: false })
    : null

  const cat = helpdeskCategoryMeta(ticket.category)
  const location = helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)
  const submitted = new Date(ticket.createdAt).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ mb: 1.5 }}>
        <Link href={`/${role}/urus-helpdesk`} style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<KIcon icon="arrow_back" size={16} />}>
            Back
          </Button>
        </Link>
      </Box>

      <Bento>
        {/* Reporter + request rail */}
        <BentoItem span={4} spanXs={2} sx={{ alignSelf: "flex-start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Surface>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "primary.main",
                    color: "#fff",
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {ticket.user.name.trim().charAt(0).toUpperCase()}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14.5, overflowWrap: "anywhere" }}>
                    {ticket.user.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ticket.user.matricId}
                    {reporterRoom && ` · ${reporterRoom}`}
                  </Typography>
                  {ticket.assignee && (
                    <Typography variant="caption" sx={{ color: "text.disabled", display: "inline-flex", alignItems: "center", gap: 0.375, mt: 0.5 }}>
                      <KIcon icon="person" size={12} />
                      Handled by {ticket.assignee.name}
                    </Typography>
                  )}
                </Box>
                <StatusChip status={ticket.status} />
              </Box>
            </Surface>

            <Surface>
              <Typography
                sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 650, lineHeight: 1.3, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}
              >
                {ticket.subject || "Helpdesk request"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 1.25 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.5,
                    borderRadius: "999px",
                    backgroundColor: cat.tone.soft,
                    color: cat.tone.ink,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <KIcon icon={cat.icon} size={13} />
                  {cat.label}
                </Box>
                {location && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      borderRadius: "999px",
                      backgroundColor: "action.hover",
                      color: "text.secondary",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <KIcon icon="location_on" size={13} />
                    {location}
                  </Box>
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1.25, fontFamily: font.mono }}>
                #{ticketRef(ticket.displayId)} · Submitted {submitted}
              </Typography>
            </Surface>
          </Box>
        </BentoItem>

        {/* Thread */}
        <BentoItem span={8} spanXs={2}>
          <AdminTicketChat
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            messages={ticket.messages}
            role={role}
          />
        </BentoItem>
      </Bento>
    </Box>
  )
}

import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { TicketChat } from "./ticket-chat"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Surface } from "@/components/kiz/primitives/list-group"
import { Bento, BentoItem } from "@/components/kiz/patterns/bento"
import { OfficeOpenBadge } from "@/components/shared/office-open-badge"
import { ticketRef, helpdeskCategoryMeta, helpdeskLocationLabel } from "@/lib/helpdesk-meta"
import { font, radius } from "@/lib/theme"
import { isOfficeHours } from "@/lib/office-hours"

function submittedDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
}

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

  const cat = helpdeskCategoryMeta(ticket.category)
  const location = helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)
  const inHours = isOfficeHours()

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ mb: 1.5 }}>
        <Link href={`/${role}/helpdesk`} style={{ textDecoration: "none" }}>
          <Button size="small" startIcon={<KIcon icon="arrow_back" size={16} />}>
            Back
          </Button>
        </Link>
      </Box>

      <Bento>
        {/* Request summary rail */}
        <BentoItem span={4} spanXs={2} sx={{ alignSelf: "flex-start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Surface>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography variant="caption" sx={{ fontFamily: font.mono, fontWeight: 600, color: "text.secondary" }}>
                  #{ticketRef(ticket.displayId)}
                </Typography>
                <StatusChip status={ticket.status} />
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: 17, sm: 19 },
                  fontWeight: 650,
                  lineHeight: 1.3,
                  letterSpacing: "-0.02em",
                  mt: 1,
                  overflowWrap: "anywhere",
                }}
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
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1.25 }}>
                Submitted {submittedDate(ticket.createdAt)}
              </Typography>
            </Surface>

            <Surface>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: `${radius.input}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    backgroundColor: inHours ? "rgba(22,163,74,0.1)" : "action.hover",
                    color: inHours ? "#15803D" : "text.secondary",
                  }}
                >
                  <KIcon icon={inHours ? "forum" : "schedule"} size={16} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <OfficeOpenBadge open={inHours} />
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75, lineHeight: 1.45 }}>
                    This is a private thread with the KIZ office — every reply lands here. Most questions get
                    an answer within office hours (Mon–Fri, 8:00 AM – 5:00 PM).
                  </Typography>
                </Box>
              </Box>
            </Surface>
          </Box>
        </BentoItem>

        {/* Conversation */}
        <BentoItem span={8} spanXs={2}>
          <TicketChat
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

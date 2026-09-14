"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Surface } from "@/components/kiz/primitives/list-group"
import { ticketRef, helpdeskCategoryMeta, helpdeskLocationLabel } from "@/lib/helpdesk-meta"
import { color, font } from "@/lib/theme"

interface TicketMessage {
  sender: { name: string; role?: string }
  message?: string
}

interface Ticket {
  id: string
  displayId: number
  subject: string | null
  category: string
  channel?: string
  status: string
  locationBlock: string | null
  locationDetail: string | null
  createdAt: Date
  updatedAt: Date
  messages: TicketMessage[]
}

interface Props {
  tickets: Ticket[]
  role: string
}

function submittedDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })
}

export function HelpdeskList({ tickets, role }: Props) {
  if (tickets.length === 0) {
    return (
      <KEmpty
        compact
        icon="forum"
        title="No requests yet"
        body="Ask your first question above — we'll get back to you, no queue needed."
      />
    )
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 1.5,
        alignItems: "stretch",
      }}
    >
      {tickets.map((ticket) => {
        const lastMsg = ticket.messages[0]
        const cat = helpdeskCategoryMeta(ticket.category)
        const location = helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)

        return (
          <Surface key={ticket.id} interactive sx={{ p: 0, overflow: "hidden" }}>
            <Link
              href={`/${role}/helpdesk/${ticket.id}`}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <Box sx={{ p: { xs: 1.75, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontFamily: font.mono, fontWeight: 600, color: "text.secondary" }}>
                      #{ticketRef(ticket.displayId)}
                    </Typography>
                    {ticket.channel === "live" && (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.25,
                          px: 0.75,
                          py: 0.125,
                          borderRadius: 999,
                          backgroundColor: color.brand[50],
                          color: color.brand[700],
                          fontSize: 10.5,
                          fontWeight: 700,
                        }}
                      >
                        <KIcon icon="forum" size={11} />
                        Live
                      </Box>
                    )}
                  </Box>
                  <StatusChip status={ticket.status} />
                </Box>

                <Typography
                  sx={{
                    fontSize: { xs: 15, sm: 16 },
                    fontWeight: 640,
                    lineHeight: 1.35,
                    letterSpacing: "-0.013em",
                    mt: 0.75,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {ticket.subject || lastMsg?.message || "(no description)"}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.625, mt: 0.75, minWidth: 0 }}>
                  <KIcon icon={cat.icon} size={14} sx={{ color: cat.tone.ink, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cat.label}
                    {location ? ` · ${location}` : ""}
                  </Typography>
                </Box>

                <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.25 }}>
                  Submitted {submittedDate(ticket.createdAt)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 0.375,
                  px: { xs: 1.75, sm: 2 },
                  py: 1,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "action.hover",
                  color: color.brand[700],
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                View Request
                <KIcon icon="arrow_forward" size={15} />
              </Box>
            </Link>
          </Surface>
        )
      })}
    </Box>
  )
}

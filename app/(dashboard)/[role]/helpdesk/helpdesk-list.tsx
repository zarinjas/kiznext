"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Ticket {
  id: string
  displayId: number
  subject: string | null
  status: string
  createdAt: Date
  messages: { sender: { name: string; role?: string }; message?: string }[]
}

interface Props {
  tickets: Ticket[]
  role: string
}

export function HelpdeskList({ tickets, role }: Props) {
  if (tickets.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
        No tickets yet. Start a new conversation above.
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {tickets.map((ticket) => {
        const lastMsg = ticket.messages[0]
        return (
          <Link key={ticket.id} href={`/${role}/helpdesk/${ticket.id}`} style={{ textDecoration: "none", color: "inherit" }}>
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
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: color.brand[50],
                  color: color.brand[700],
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                KIZ-{ticket.displayId}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ticket.subject || lastMsg?.message || "(no messages)"}
                </Typography>
                {ticket.subject && lastMsg?.message && (
                  <Typography variant="body2" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lastMsg.message}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {ticket.createdAt.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })}
                </Typography>
              </Box>
              <StatusChip status={ticket.status} />
              <KIcon icon="chevron_right" size={18} sx={{ color: "text.disabled" }} />
            </Box>
          </Link>
        )
      })}
    </Box>
  )
}

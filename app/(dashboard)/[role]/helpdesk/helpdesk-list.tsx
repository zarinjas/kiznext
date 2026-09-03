"use client"

import Box from "@mui/material/Box"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { font } from "@/lib/theme"

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
      <Box sx={{ py: 5, textAlign: "center", color: "text.secondary", fontSize: 14 }}>
        No tickets yet. Start a new conversation above.
      </Box>
    )
  }

  return (
    <ListGroup>
      {tickets.map((ticket) => {
        const lastMsg = ticket.messages[0]
        return (
          <ListRow
            key={ticket.id}
            href={`/${role}/helpdesk/${ticket.id}`}
            title={ticket.subject || lastMsg?.message || "(no messages)"}
            subtitle={
              <>
                <Box component="span" sx={{ fontFamily: font.mono }}>
                  KIZ-{ticket.displayId}
                </Box>
                {" · "}
                {ticket.createdAt.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                {ticket.subject && lastMsg?.message && ` · ${lastMsg.message}`}
              </>
            }
            trailing={<StatusChip status={ticket.status} />}
          />
        )
      })}
    </ListGroup>
  )
}

"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"

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
  compact?: boolean
}

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-500",
}

export function HelpdeskList({ tickets, role, compact = false }: Props) {
  if (tickets.length === 0) {
    return (
      <div className={compact ? "rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground" : "rounded-lg border bg-card p-8 text-center text-muted-foreground"}>
        No tickets yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => {
        const lastMsg = ticket.messages[0]
        return (
          <Link
            key={ticket.id}
            href={`/${role}/helpdesk/${ticket.id}`}
            className={
              compact
                ? "flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-sm active:bg-muted"
                : "flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted"
            }
          >
            <span className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-foreground ${compact ? "size-8" : ""}`}>
              <span className="text-xs font-bold">KIZ-{ticket.displayId}</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">
                {ticket.subject || lastMsg?.message || "(no messages)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.subject && lastMsg?.message && (
                  <span className="truncate block">{lastMsg.message}</span>
                )}
                <span>
                  {ticket.createdAt.toLocaleDateString("ms-MY", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] || ""}`}>
              {statusLabels[ticket.status] || ticket.status}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

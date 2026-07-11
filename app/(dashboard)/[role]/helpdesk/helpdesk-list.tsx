"use client"

import Link from "next/link"
import { MessageSquare } from "lucide-react"

interface Ticket {
  id: string
  status: string
  createdAt: Date
  messages: { sender: { name: string }; message?: string }[]
}

interface Props {
  tickets: Ticket[]
  role: string
}

const statusLabels: Record<string, string> = {
  open: "Terbuka",
  in_progress: "Dalam Proses",
  closed: "Ditutup",
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  closed: "bg-gray-100 text-gray-500",
}

export function HelpdeskList({ tickets, role }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Tiada ticket lagi.
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
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-4 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">
                {lastMsg?.message || "(tiada mesej)"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.createdAt.toLocaleDateString("ms-MY", {
                  day: "numeric", month: "short", year: "numeric",
                })}
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

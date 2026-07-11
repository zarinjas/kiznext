import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function UrusHelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { name: true, matricId: true } },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
      assignee: { select: { name: true } },
    },
    orderBy: [
      { status: "asc" },
      { updatedAt: "desc" },
    ],
  })

  const openTickets = tickets.filter((t) => t.status !== "closed")
  const closedTickets = tickets.filter((t) => t.status === "closed")

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

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Urus Helpdesk
      </h1>
      <p className="mt-1 text-muted-foreground">
        Balas dan urus ticket sokongan pelajar.
      </p>

      <div className="mt-8 space-y-2">
        {openTickets.map((ticket) => (
          <Link
            key={ticket.id}
            href={`/${session.user.role}/urus-helpdesk/${ticket.id}`}
            className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-4 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">
                {ticket.user.name} ({ticket.user.matricId})
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {ticket.messages[0]?.message || "(kosong)"}
              </p>
            </div>
            {ticket.assignee && (
              <span className="text-xs text-muted-foreground">
                {ticket.assignee.name}
              </span>
            )}
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
          </Link>
        ))}
        {openTickets.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Tiada ticket terbuka.
          </div>
        )}
      </div>

      {closedTickets.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-heading text-lg text-primary-foreground">
            Ditutup ({closedTickets.length})
          </summary>
          <div className="mt-3 space-y-2">
            {closedTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/${session.user.role}/urus-helpdesk/${ticket.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted"
              >
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{ticket.user.name} ({ticket.user.matricId})</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Ditutup</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { TicketChat } from "./ticket-chat"

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

  const isAhli = role === "ahli"

  return (
    <div className={isAhli ? "flex h-[calc(100vh-8.5rem)] flex-col px-4 py-4" : "mx-auto max-w-3xl"}>
      <div className="mb-3 shrink-0">
        <a
          href={`/${role}/helpdesk`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Kembali
        </a>
      </div>
      <div className={isAhli ? "flex-1 overflow-hidden" : ""}>
        <TicketChat
          ticketId={ticket.id}
          ticketStatus={ticket.status}
          messages={ticket.messages}
          role={role}
          compact={isAhli}
        />
      </div>
    </div>
  )
}

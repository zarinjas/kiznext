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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4">
        <a
          href={`/${role}/helpdesk`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Kembali
        </a>
      </div>
      <TicketChat
        ticketId={ticket.id}
        ticketStatus={ticket.status}
        messages={ticket.messages}
        role={role}
      />
    </div>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { HelpdeskList } from "./helpdesk-list"
import { NewTicketForm } from "./new-ticket-form"

export default async function HelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { sender: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Helpdesk & Sokongan
      </h1>
      <p className="mt-1 text-muted-foreground">
        Hubungi pihak pengurusan KIZ untuk sebarang pertanyaan atau masalah.
      </p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg text-primary-foreground mb-4">
          Ticket Baru
        </h2>
        <NewTicketForm role={session.user.role} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-heading text-lg text-primary-foreground">
          Ticket Anda
        </h2>
        <HelpdeskList tickets={tickets} role={session.user.role} />
      </div>
    </div>
  )
}

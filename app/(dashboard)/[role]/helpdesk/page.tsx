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

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-3xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Helpdesk & Sokongan
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Hubungi pihak pengurusan KIZ untuk sebarang pertanyaan atau masalah.
      </p>

      <div className={isAhli ? "mt-5 rounded-2xl border border-border bg-card p-5" : "mt-8 rounded-lg border bg-card p-6"}>
        <h2 className={isAhli ? "font-heading text-base text-primary-foreground mb-4" : "font-heading text-lg text-primary-foreground mb-4"}>
          Ticket Baru
        </h2>
        <NewTicketForm role={session.user.role} />
      </div>

      <div className={isAhli ? "mt-6" : "mt-8"}>
        <h2 className={isAhli ? "mb-2 text-sm font-semibold text-foreground" : "mb-3 font-heading text-lg text-primary-foreground"}>
          Ticket Anda
        </h2>
        <HelpdeskList tickets={tickets} role={session.user.role} compact={isAhli} />
      </div>
    </div>
  )
}

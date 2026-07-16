import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { HelpdeskList } from "./helpdesk-list"
import { NewTicketForm } from "./new-ticket-form"
import { isOfficeHours } from "@/lib/office-hours"
import { MessageSquare } from "lucide-react"

export default async function HelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { sender: { select: { name: true, role: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  // Kira unread: messages terakhir dari admin & belum dibalas pelajar
  const unreadCount = tickets.filter((t) => {
    if (t.status === "closed") return false
    const lastMsg = t.messages[0]
    if (!lastMsg) return false
    const isAdmin = lastMsg.sender.role === "admin_kiz" || lastMsg.sender.role === "superadmin"
    return isAdmin && !lastMsg.isAutoReply
  }).length

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-3xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Help & Support
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask questions or get help from KIZ management.
      </p>

      {/* Availability notice */}
      <div className={`mt-4 rounded-2xl border p-4 text-sm ${
        isOfficeHours()
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}>
        <p className="font-medium">
          {isOfficeHours()
            ? "🟢 Office hours — We're online!"
            : "🔴 Outside office hours"}
        </p>
        <p className="mt-0.5 text-xs opacity-80">
          Monday–Friday, 8:00 AM – 5:00 PM (Malaysian Time).
          {!isOfficeHours() && " Your message will be replied when office hours start."}
        </p>
      </div>

      <div className={isAhli ? "mt-5 rounded-2xl border border-border bg-card p-5" : "mt-8 rounded-lg border bg-card p-6"}>
        <h2 className={isAhli ? "font-heading text-base text-primary-foreground mb-4" : "font-heading text-lg text-primary-foreground mb-4"}>
          New Question
        </h2>
        <NewTicketForm role={session.user.role} />
      </div>

      <div className={isAhli ? "mt-6" : "mt-8"}>
        <div className="mb-2 flex items-center gap-2">
          <h2 className={isAhli ? "text-sm font-semibold text-foreground" : "font-heading text-lg text-primary-foreground"}>
            Your Conversations
          </h2>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              <MessageSquare className="size-3" />
              {unreadCount} unread
            </span>
          )}
        </div>
        <HelpdeskList tickets={tickets} role={session.user.role} compact={isAhli} />
      </div>
    </div>
  )
}

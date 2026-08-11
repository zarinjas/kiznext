import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ReportForm } from "./report-form"
import { LostFoundList } from "./lost-found-list"

export default async function HilangPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const items = await prisma.lostFoundItem.findMany({
    where: { deletedAt: null },
    include: { reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-3xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Lost & Found
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Report lost or found items at KIZ.
      </p>

      <div className={isAhli ? "mt-5 rounded-2xl border border-border bg-card p-5" : "mt-8 rounded-lg border bg-card p-6"}>
        <h2 className={isAhli ? "font-heading text-base text-primary-foreground mb-4" : "font-heading text-lg text-primary-foreground mb-4"}>
          New Report
        </h2>
        <ReportForm role={session.user.role} />
      </div>

      <div className={isAhli ? "mt-6" : "mt-8"}>
        <LostFoundList
          items={items}
          userId={session.user.id}
          role={session.user.role}
          compact={isAhli}
        />
      </div>
    </div>
  )
}

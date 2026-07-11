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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Lost & Found
      </h1>
      <p className="mt-1 text-muted-foreground">
        Lapor barang hilang atau jumpa barang di KIZ.
      </p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg text-primary-foreground mb-4">
          Laporan Baru
        </h2>
        <ReportForm role={session.user.role} />
      </div>

      <div className="mt-8">
        <LostFoundList items={items} userId={session.user.id} role={session.user.role} />
      </div>
    </div>
  )
}

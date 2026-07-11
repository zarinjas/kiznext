import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Building2, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

export default async function TempahanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const blocks = await prisma.block.findMany({
    include: {
      facilities: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  const bookings = await prisma.facilityBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { facility: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Tempahan Fasiliti
      </h1>
      <p className="mt-1 text-muted-foreground">
        Tempah kemudahan kolej untuk kegunaan anda.
      </p>

      {bookings.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-lg text-primary-foreground">
            Tempahan Terkini
          </h2>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                {b.status === "approved" ? (
                  <CheckCircle className="size-4 shrink-0 text-green-600" />
                ) : (
                  <Clock className="size-4 shrink-0 text-amber-600" />
                )}
                <span className="flex-1">{b.facility.name}</span>
                <span className="text-muted-foreground">
                  {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}
                  {" "}
                  {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                  {" – "}
                  {b.timeSlotEnd.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === "approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {b.status === "approved" ? "Disahkan" : "Menunggu"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6">
        {blocks.map((block) => (
          <div key={block.id}>
            <h2 className="font-heading text-lg text-primary-foreground flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              {block.name}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {block.facilities.map((facility) => (
                <div key={facility.id} className="rounded-lg border bg-card p-4">
                  <h3 className="font-medium text-foreground">{facility.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {facility.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {facility.capacity ? `${facility.capacity} orang` : "Tiada had"}
                    </span>
                    <Link
                      href={`/${session.user.role}/tempahan/${facility.id}`}
                      className="inline-flex h-7 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                    >
                      Tempah
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Building2, CheckCircle, Clock, Users, ChevronRight } from "lucide-react"
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
    <div className="px-4 py-5">
      <h1 className="font-heading text-xl text-primary-foreground">
        Tempahan Fasiliti
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tempah kemudahan kolej untuk kegunaan anda.
      </p>

      {bookings.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Tempahan Terkini
          </h2>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
                {b.status === "approved" ? (
                  <CheckCircle className="size-4 shrink-0 text-green-600" />
                ) : (
                  <Clock className="size-4 shrink-0 text-amber-600" />
                )}
                <span className="min-w-0 flex-1 truncate">{b.facility.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}
                  {" "}
                  {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === "approved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {b.status === "approved" ? "Disahkan" : "Menunggu"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {blocks.map((block) => (
          <div key={block.id}>
            <h2 className="font-heading text-base text-primary-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {block.name}
            </h2>
            <div className="mt-3 space-y-2">
              {block.facilities.map((facility) => (
                <Link
                  key={facility.id}
                  href={`/${session.user.role}/tempahan/${facility.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 active:bg-muted"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground">{facility.name}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {facility.description}
                    </p>
                    {facility.capacity && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3" />
                        {facility.capacity} orang
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { GHBookingForm } from "./booking-form"
import { CheckCircle, Clock, Luggage } from "lucide-react"

export default async function RumahTamuPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const bookings = await prisma.guestHouseBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  const statusLabels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disahkan",
    rejected: "Ditolak",
    checked_in: "Check-In",
    checked_out: "Check-Out",
    cancelled: "Batal",
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-destructive",
    checked_in: "bg-blue-100 text-blue-700",
    checked_out: "bg-gray-100 text-gray-600",
    cancelled: "bg-gray-100 text-gray-500",
  }

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-2xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Tempahan Rumah Tamu
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tempah penginapan untuk tetamu luar, alumni, atau keluarga.
      </p>

      <div className={isAhli ? "mt-5 rounded-2xl border border-border bg-card p-5" : "mt-8 rounded-lg border bg-card p-6"}>
        <h2 className={isAhli ? "font-heading text-base text-primary-foreground mb-4" : "font-heading text-lg text-primary-foreground mb-4"}>
          Tempah Baru
        </h2>
        <GHBookingForm role={session.user.role} />
      </div>

      {bookings.length > 0 && (
        <div className={isAhli ? "mt-6" : "mt-8"}>
          <h2 className={isAhli ? "mb-2 text-sm font-semibold text-foreground" : "mb-3 font-heading text-lg text-primary-foreground"}>
            Tempahan Lepas
          </h2>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div key={b.id} className={isAhli ? "flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-sm" : "flex items-center gap-3 rounded-lg border bg-card p-3 text-sm"}>
                <Luggage className="size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{b.guestName}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status]}`}>
                  {statusLabels[b.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

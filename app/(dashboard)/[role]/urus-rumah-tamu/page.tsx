import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { GHManageButtons } from "./manage-buttons"
import { CheckCircle, Clock, XCircle } from "lucide-react"

export default async function UrusRumahTamuPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const bookings = await prisma.guestHouseBooking.findMany({
    where: { deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => ["approved", "checked_in"].includes(b.status))
  const done = bookings.filter((b) => ["rejected", "checked_out", "cancelled"].includes(b.status))

  const statusLabels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disahkan",
    checked_in: "Check-In",
    checked_out: "Check-Out",
    rejected: "Ditolak",
    cancelled: "Batal",
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Urus Rumah Tamu
      </h1>
      <p className="mt-1 text-muted-foreground">
        Urus tempahan penginapan tetamu, kelulusan, dan check-in/out.
      </p>

      {pending.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg text-amber-700">
            <Clock className="size-5" /> Menunggu Kelulusan
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{b.guestName}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.user.name} ({b.user.matricId})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")}
                      {" · "}
                      {b.periodType === "daily" ? "Harian" : b.periodType === "weekly" ? "Mingguan" : "Bulanan"}
                    </p>
                  </div>
                  <GHManageButtons bookingId={b.id} status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-lg text-blue-700">Aktif</h2>
          <div className="space-y-2">
            {active.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                <span className="flex-1">
                  <span className="font-medium">{b.guestName}</span>
                  <span className="text-muted-foreground">
                    {" "}— {b.user.name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")}
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {statusLabels[b.status]}
                </span>
                <GHManageButtons bookingId={b.id} status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && active.length === 0 && (
        <div className="mt-8 rounded-lg border bg-card p-8 text-center">
          <CheckCircle className="mx-auto size-8 text-green-600" />
          <p className="mt-2 text-muted-foreground">Tiada tempahan aktif.</p>
        </div>
      )}

      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-heading text-lg text-primary-foreground">
            Sejarah ({done.length})
          </summary>
          <div className="mt-3 space-y-2">
            {done.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                <XCircle className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1">{b.guestName} — {b.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {statusLabels[b.status]}
                  {b.paymentStatus === "paid_manual" && " · Dibayar"}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

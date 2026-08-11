import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { ApproveRejectButtons } from "./approve-reject-buttons"
import { CheckCircle, Clock, XCircle } from "lucide-react"

export default async function UrusTempahanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const bookings = await prisma.facilityBooking.findMany({
    where: { deletedAt: null },
    include: {
      facility: true,
      user: true,
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const others = bookings.filter((b) => b.status !== "pending")

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Manage Facility Bookings
      </h1>
      <p className="mt-1 text-muted-foreground">
        Approve or reject student facility bookings.
      </p>

      {pending.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg text-amber-700">
            <Clock className="size-5" />
            Awaiting Approval ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{b.facility.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {b.user.name} ({b.user.matricId})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })}
                      {" "}
                      {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {b.timeSlotEnd.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <ApproveRejectButtons bookingId={b.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="mt-8 rounded-lg border bg-card p-8 text-center">
          <CheckCircle className="mx-auto size-8 text-green-600" />
          <p className="mt-2 text-muted-foreground">No bookings awaiting approval.</p>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-heading text-lg text-primary-foreground">
            Booking History
          </h2>
          <div className="space-y-2">
            {others.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                {b.status === "approved" ? (
                  <CheckCircle className="size-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="size-4 shrink-0 text-destructive" />
                )}
                <span className="flex-1">{b.facility.name} — {b.user.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  b.status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-destructive"
                }`}>
                  {b.status === "approved" ? "Approved" : "Rejected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

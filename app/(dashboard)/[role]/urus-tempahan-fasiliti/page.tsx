import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { Clock, CheckCircle, XCircle, FileText } from "lucide-react"
import Link from "next/link"

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disahkan",
  rejected: "Ditolak",
  cancelled: "Batal",
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-destructive",
  cancelled: "bg-gray-100 text-gray-500",
}

export default async function UrusTempahanFasilitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const bookings = await prisma.facilityBooking.findMany({
    where: { deletedAt: null },
    include: {
      facility: { select: { name: true, price: true } },
      user: { select: { name: true, matricId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => b.status === "approved")
  const done = bookings.filter((b) => ["rejected", "cancelled"].includes(b.status))

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl text-primary-foreground">Urus Tempahan Fasiliti</h1>
      <p className="mt-1 text-muted-foreground">Lulus atau tolak tempahan fasiliti pelajar dan kakitangan.</p>

      {pending.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-heading text-lg text-amber-700">
            <Clock className="size-5" /> Menunggu Kelulusan ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((b) => (
              <div key={b.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {b.facility.name}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{b.bookingRef}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {b.user.name} ({b.user.matricId})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {b.timeSlotEnd.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                      {b.purpose && ` · ${b.purpose}`}
                    </p>
                    {b.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">Nota: {b.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 ml-4">
                    {b.pdfUrl && (
                      <Link href={b.pdfUrl} target="_blank" className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
                        <FileText className="mr-1 size-3" /> PDF
                      </Link>
                    )}
                  </div>
                </div>
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
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{b.facility.name}</span>
                  <span className="text-muted-foreground"> — {b.user.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">{b.bookingRef}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status]}`}>
                  {statusLabels[b.status]}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

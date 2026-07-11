import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { ParcelForm } from "./parcel-form"
import { ParcelCollectButton } from "./parcel-collect-button"
import { Package, CheckCircle } from "lucide-react"

export default async function UrusParcelPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const parcels = await prisma.parcel.findMany({
    where: { deletedAt: null },
    include: { user: { select: { name: true, matricId: true } } },
    orderBy: { createdAt: "desc" },
  })

  const active = parcels.filter((p) => p.status === "arrived")
  const done = parcels.filter((p) => p.status === "collected")

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Urus Parcel
      </h1>
      <p className="mt-1 text-muted-foreground">
        Daftar bungkusan yang tiba untuk pelajar.
      </p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg text-primary-foreground mb-4">Daftar Bungkusan Baru</h2>
        <ParcelForm />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-heading text-lg text-amber-700">
          Belum Diambil ({active.length})
        </h2>
        <div className="space-y-2">
          {active.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
              <Package className="size-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-foreground">{p.user.name} ({p.user.matricId})</p>
                {p.description && (
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                )}
              </div>
              <ParcelCollectButton parcelId={p.id} />
            </div>
          ))}
          {active.length === 0 && (
            <p className="text-muted-foreground">Tiada bungkusan aktif.</p>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-heading text-lg text-primary-foreground">
            Sudah Diambil ({done.length})
          </summary>
          <div className="mt-3 space-y-2">
            {done.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                <CheckCircle className="size-4 shrink-0 text-green-600" />
                <span className="flex-1">{p.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.collectedAt?.toLocaleDateString("ms-MY")}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

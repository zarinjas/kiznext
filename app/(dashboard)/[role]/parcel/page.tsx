import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Package, CheckCircle } from "lucide-react"

export default async function ParcelPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const parcels = await prisma.parcel.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Bungkusan Saya
      </h1>
      <p className="mt-1 text-muted-foreground">
        Semak status bungkusan yang tiba di pejabat KIZ.
      </p>

      <div className="mt-8 space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              {p.status === "arrived" ? (
                <Package className="mt-1 size-5 shrink-0 text-amber-600" />
              ) : (
                <CheckCircle className="mt-1 size-5 shrink-0 text-green-600" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {p.status === "arrived" ? "Bungkusan Tiba" : "Sudah Diambil"}
                </p>
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Didaftar: {p.createdAt.toLocaleDateString("ms-MY")}
                </p>
                {p.collectedAt && (
                  <p className="text-xs text-muted-foreground">
                    Diambil: {p.collectedAt.toLocaleDateString("ms-MY")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {parcels.length === 0 && (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Tiada bungkusan.
          </div>
        )}
      </div>
    </div>
  )
}

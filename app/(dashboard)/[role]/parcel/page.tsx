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

  const isAhli = session.user.role === "ahli"

  // Coming Soon — Parcel tracker
  const comingSoon = true

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-2xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        My Parcels
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Check the status of parcels arriving at the KIZ office.
      </p>

      {/* Coming Soon Banner */}
      {comingSoon && (
        <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <span className="text-4xl">📦</span>
          <h2 className="mt-3 font-heading text-lg text-primary-foreground">Coming Soon</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parcel tracking module is under development. You will be notified when your parcels arrive through the app soon.
          </p>
          <div className="mt-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary-foreground">
            Coming Soon
          </div>
        </div>
      )}

      <div className={isAhli ? "mt-5 space-y-2" : "mt-8 space-y-3"}>
        {parcels.map((p) => (
          <div key={p.id} className={isAhli ? "rounded-2xl border border-border bg-card p-4" : "rounded-lg border bg-card p-4"}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full ${
                p.status === "arrived" ? "bg-amber-100" : "bg-green-100"
              } ${isAhli ? "size-9" : ""}`}>
                {p.status === "arrived" ? (
                  <Package className="size-4 text-amber-600" />
                ) : (
                  <CheckCircle className="size-4 text-green-600" />
                )}
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {p.status === "arrived" ? "Arrived" : "Collected"}
                </p>
                {p.description && (
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Registered: {p.createdAt.toLocaleDateString("ms-MY")}
                </p>
                {p.collectedAt && (
                  <p className="text-xs text-muted-foreground">
                    Collected: {p.collectedAt.toLocaleDateString("ms-MY")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {parcels.length === 0 && (
          <div className={isAhli ? "rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground" : "rounded-lg border bg-card p-8 text-center text-muted-foreground"}>
            No parcels.
          </div>
        )}
      </div>
    </div>
  )
}

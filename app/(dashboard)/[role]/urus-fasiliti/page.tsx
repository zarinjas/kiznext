import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { FacilityList } from "./facility-list"

export default async function UrusFasilitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const [facilities, blocks] = await Promise.all([
    prisma.facility.findMany({
      where: { deletedAt: null },
      include: { block: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.block.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-primary-foreground">
            Urus Fasiliti
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tambah, edit, dan uruskan fasiliti KIZ.
          </p>
        </div>
      </div>

      <FacilityList
        facilities={facilities.map((f) => ({
          id: f.id,
          name: f.name,
          blockName: f.block.name,
          description: f.description,
          featuredImage: f.featuredImage,
          gallery: f.gallery,
          price: f.price,
          capacity: f.capacity,
          timeSlotDuration: f.timeSlotDuration,
          maxPerDay: f.maxPerDay,
          requiresApproval: f.requiresApproval,
        }))}
        blocks={blocks.map((b) => ({ id: b.id, name: b.name }))}
        role={session.user.role}
      />
    </div>
  )
}

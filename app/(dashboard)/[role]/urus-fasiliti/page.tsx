import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
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
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Facilities"
        subtitle="Add, edit, and manage KIZ facilities."
      />
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
    </Box>
  )
}

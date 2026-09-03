import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { OfficeAdmin } from "./office-admin"

export default async function UrusPejabatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const [offices, blocks] = await Promise.all([
    prisma.office.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
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
        title="Manage Offices"
        subtitle="Edit the administrative offices students see, and the interactive block panorama."
      />
      <OfficeAdmin
        offices={offices.map((o) => ({
          id: o.id,
          name: o.name,
          description: o.description,
          featuredImage: o.featuredImage,
          gallery: o.gallery,
        }))}
        blocks={blocks.map((b) => ({
          id: b.id,
          name: b.name,
          panoramaImage: b.panoramaImage,
          panoramaLeftX: b.panoramaLeftX,
          panoramaRightX: b.panoramaRightX,
        }))}
      />
    </Box>
  )
}

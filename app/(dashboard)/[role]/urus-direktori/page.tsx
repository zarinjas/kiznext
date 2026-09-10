import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { DirektoriAdmin } from "./direktori-admin"

export default async function UrusDirektoriPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const destinations = await prisma.destination.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="AR Directory Destinations"
        subtitle="The places the camera arrow can point at. Each pin needs a latitude & longitude."
      />
      <DirektoriAdmin
        destinations={destinations.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          icon: d.icon,
          latitude: d.latitude,
          longitude: d.longitude,
          indoor: d.indoor,
          building: d.building,
          description: d.description,
          sortOrder: d.sortOrder,
        }))}
      />
    </Box>
  )
}

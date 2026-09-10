import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { ContentAdmin } from "./content-admin"

export default async function UrusKandunganPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const items = await prisma.contentItem.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="Dashboard Content"
        subtitle="Emergency contacts and the Life at KIZ living guide shown on member dashboards."
      />
      <ContentAdmin
        items={items.map((c) => ({
          id: c.id,
          kind: c.kind,
          title: c.title,
          subtitle: c.subtitle,
          body: c.body,
          phone: c.phone,
          link: c.link,
          sortOrder: c.sortOrder,
        }))}
      />
    </Box>
  )
}

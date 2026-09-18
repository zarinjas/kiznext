import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { formatFileSize } from "@/lib/guide-meta"
import { GuidesAdmin } from "./guides-admin"

export default async function UrusPanduanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const guides = await prisma.guide.findMany({
    where: { deletedAt: null },
    orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  })

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="Digital Guides"
        subtitle="Upload PDFs — orientation guides, rules and programme handbooks. Residents read them in the app as a flipbook or download a copy."
      />
      <GuidesAdmin
        guides={guides.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          fileUrl: g.fileUrl,
          fileSize: g.fileSize,
          coverImage: g.coverImage,
          pageCount: g.pageCount,
          published: g.published,
          isPinned: g.isPinned,
          sortOrder: g.sortOrder,
          displayDate: new Intl.DateTimeFormat("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            dateStyle: "medium",
          }).format(g.createdAt),
          sizeLabel: formatFileSize(g.fileSize),
        }))}
      />
    </Box>
  )
}

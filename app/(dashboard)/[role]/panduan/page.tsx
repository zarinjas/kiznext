import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { formatFileSize } from "@/lib/guide-meta"
import { GuideLibrary } from "./guide-library"

export default async function PanduanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role as Role

  const guides = await prisma.guide.findMany({
    where: { deletedAt: null, published: true },
    orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      reads: {
        where: { userId: session.user.id, deletedAt: null },
        select: { id: true },
      },
    },
  })

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Library"
        title="Digital Guide"
        subtitle="Orientation, rules and programme handbooks — read them in the app or download a copy."
      />
      <GuideLibrary
        role={role}
        guides={guides.map((g) => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          coverImage: g.coverImage,
          pageCount: g.pageCount,
          isPinned: g.isPinned,
          isNew: g.reads.length === 0,
          sizeLabel: formatFileSize(g.fileSize),
          displayDate: new Intl.DateTimeFormat("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            dateStyle: "medium",
          }).format(g.createdAt),
        }))}
      />
    </Box>
  )
}

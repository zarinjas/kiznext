import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { AnnouncementFeed } from "./announcement-feed"

export default async function PengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const tags = [...new Set(announcements.map((a) => a.tag))]

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Overview"
        title="Announcements"
        subtitle="Latest info from KIZ management."
      />
      <AnnouncementFeed announcements={announcements} tags={tags} />
    </Box>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { AnnouncementFeed } from "./announcement-feed"
import { getAnnouncementFeed } from "@/lib/announcements"

export default async function PengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const member = ["ahli", "staf", "fellow"].includes(session.user.role)

  const cards = await getAnnouncementFeed(session.user.id, member)
  const tags = [...new Set(cards.map((a) => a.tag))]

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Overview"
        title="Announcements"
        subtitle="Stay updated with the latest news and notices from KIZ."
      />
      <AnnouncementFeed announcements={cards} tags={tags} canInteract={member} />
    </Box>
  )
}

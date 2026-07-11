import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
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
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Pengumuman
      </h1>
      <p className="mt-1 text-muted-foreground">
        Info terkini dari pihak pengurusan KIZ.
      </p>

      <AnnouncementFeed announcements={announcements} tags={tags} />
    </div>
  )
}

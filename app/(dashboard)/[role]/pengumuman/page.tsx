import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { AnnouncementFeed } from "./announcement-feed"

export default async function PengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const isAhli = session.user.role === "ahli"

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const tags = [...new Set(announcements.map((a) => a.tag))]

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-3xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Pengumuman
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Info terkini dari pihak pengurusan KIZ.
      </p>

      <AnnouncementFeed announcements={announcements} tags={tags} compact={isAhli} />
    </div>
  )
}

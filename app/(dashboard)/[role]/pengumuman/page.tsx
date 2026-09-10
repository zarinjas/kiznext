import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { AnnouncementFeed, type AnnouncementCard } from "./announcement-feed"
import type { AnnouncementReactionType } from "@/lib/announcement-meta"

export default async function PengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const member = ["ahli", "staf", "fellow"].includes(session.user.role)

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })

  const ids = announcements.map((a) => a.id)

  // Reaction counts are shown to everyone; "mine" + read state only matter for
  // members (ahli/staf) who can actually react to / read announcements.
  const [reactionAgg, myReactions, myReads, myAcks] = await Promise.all([
    ids.length
      ? prisma.announcementReaction.groupBy({
          by: ["announcementId", "type"],
          where: { deletedAt: null, announcementId: { in: ids } },
          _count: { _all: true },
        })
      : [],
    member && ids.length
      ? prisma.announcementReaction.findMany({
          where: { userId: session.user.id, deletedAt: null, announcementId: { in: ids } },
          select: { announcementId: true, type: true },
        })
      : [],
    member && ids.length
      ? prisma.announcementRead.findMany({
          where: { userId: session.user.id, announcementId: { in: ids } },
          select: { announcementId: true },
        })
      : [],
    member && ids.length
      ? prisma.announcementAcknowledgment.findMany({
          where: { userId: session.user.id, deletedAt: null, announcementId: { in: ids } },
          select: { announcementId: true },
        })
      : [],
  ])

  // announcementId → { noted: n, excited: n, interested: n }
  const countsByAnnouncement = new Map<string, Partial<Record<AnnouncementReactionType, number>>>()
  for (const row of reactionAgg) {
    const entry = countsByAnnouncement.get(row.announcementId) ?? {}
    entry[row.type as AnnouncementReactionType] = row._count._all
    countsByAnnouncement.set(row.announcementId, entry)
  }

  // announcementId → reaction types the signed-in member has given.
  const mineByAnnouncement = new Map<string, Set<AnnouncementReactionType>>()
  for (const r of myReactions) {
    const set = mineByAnnouncement.get(r.announcementId) ?? new Set<AnnouncementReactionType>()
    set.add(r.type as AnnouncementReactionType)
    mineByAnnouncement.set(r.announcementId, set)
  }
  // A legacy "important" acknowledgement also counts as a Noted reaction.
  for (const a of myAcks) {
    const set = mineByAnnouncement.get(a.announcementId) ?? new Set<AnnouncementReactionType>()
    set.add("noted")
    mineByAnnouncement.set(a.announcementId, set)
  }

  const readSet = new Set(myReads.map((r) => r.announcementId))

  const cards: AnnouncementCard[] = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    tag: a.tag,
    attachmentUrl: a.attachmentUrl,
    attachmentType: a.attachmentType,
    isPinned: a.isPinned,
    createdAt: a.createdAt,
    expiresAt: a.expiresAt,
    posterName: a.poster.name,
    reactions: {
      noted: countsByAnnouncement.get(a.id)?.noted ?? 0,
      excited: countsByAnnouncement.get(a.id)?.excited ?? 0,
      interested: countsByAnnouncement.get(a.id)?.interested ?? 0,
    },
    mine: member ? [...(mineByAnnouncement.get(a.id) ?? [])] : [],
    unread: member ? !readSet.has(a.id) : false,
  }))

  const tags = [...new Set(announcements.map((a) => a.tag))]

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

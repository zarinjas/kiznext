import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"
import { ANNOUNCEMENT_REACTIONS, type AnnouncementReactionType } from "@/lib/announcement-meta"

/**
 * Announcement feed + member interactions (read / reaction).
 *
 * Extracted from the `pengumuman` Server Actions so the web feed and the mobile
 * API route share one implementation of the reaction/acknowledgement rules.
 */

export interface AnnouncementFeedItem {
  id: string
  title: string
  content: string
  tag: string
  attachmentUrl: string | null
  attachmentType: string | null
  isPinned: boolean
  createdAt: Date
  scheduledAt: Date | null
  expiresAt: Date | null
  posterName: string
  reactions: Record<AnnouncementReactionType, number>
  mine: AnnouncementReactionType[]
  unread: boolean
}

/**
 * Build the announcement feed. Reaction counts are visible to everyone;
 * `mine` + read state only apply to members (`ahli`/`staf`/`fellow`) who can
 * actually interact. Pass `userId = null` / `isMember = false` for a read-only
 * viewer.
 */
export async function getAnnouncementFeed(
  userId: string | null,
  isMember: boolean,
): Promise<AnnouncementFeedItem[]> {
  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })

  const ids = announcements.map((a) => a.id)
  const canInteract = isMember && Boolean(userId) && ids.length > 0

  const [reactionAgg, myReactions, myReads, myAcks] = await Promise.all([
    ids.length
      ? prisma.announcementReaction.groupBy({
          by: ["announcementId", "type"],
          where: { deletedAt: null, announcementId: { in: ids } },
          _count: { _all: true },
        })
      : [],
    canInteract
      ? prisma.announcementReaction.findMany({
          where: { userId: userId!, deletedAt: null, announcementId: { in: ids } },
          select: { announcementId: true, type: true },
        })
      : [],
    canInteract
      ? prisma.announcementRead.findMany({
          where: { userId: userId!, announcementId: { in: ids } },
          select: { announcementId: true },
        })
      : [],
    canInteract
      ? prisma.announcementAcknowledgment.findMany({
          where: { userId: userId!, deletedAt: null, announcementId: { in: ids } },
          select: { announcementId: true },
        })
      : [],
  ])

  const countsByAnnouncement = new Map<string, Partial<Record<AnnouncementReactionType, number>>>()
  for (const row of reactionAgg) {
    const entry = countsByAnnouncement.get(row.announcementId) ?? {}
    entry[row.type as AnnouncementReactionType] = row._count._all
    countsByAnnouncement.set(row.announcementId, entry)
  }

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

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    tag: a.tag,
    attachmentUrl: a.attachmentUrl,
    attachmentType: a.attachmentType,
    isPinned: a.isPinned,
    createdAt: a.createdAt,
    scheduledAt: a.scheduledAt,
    expiresAt: a.expiresAt,
    posterName: a.poster.name,
    reactions: {
      noted: countsByAnnouncement.get(a.id)?.noted ?? 0,
      excited: countsByAnnouncement.get(a.id)?.excited ?? 0,
      interested: countsByAnnouncement.get(a.id)?.interested ?? 0,
    },
    mine: canInteract ? [...(mineByAnnouncement.get(a.id) ?? [])] : [],
    unread: canInteract ? !readSet.has(a.id) : false,
  }))
}

/** Mark an announcement as read for a member. Idempotent. */
export async function markAnnouncementRead(userId: string, announcementId: string): Promise<void> {
  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: null },
    select: { id: true },
  })
  if (!announcement) throw new Error("Announcement not found.")

  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId, announcementId } },
    update: { readAt: nowMalaysia(), deletedAt: null },
    create: { userId, announcementId },
  })
}

/**
 * Toggle one of 👍 Noted / ❤️ Excited / 🙋 Interested. For "important"
 * announcements the "noted" reaction also toggles the acknowledgement that
 * clears the dashboard "Things to Do" task.
 */
export async function toggleAnnouncementReaction(
  userId: string,
  announcementId: string,
  type: AnnouncementReactionType,
): Promise<void> {
  if (!ANNOUNCEMENT_REACTIONS.some((r) => r.type === type)) {
    throw new Error("Unknown reaction.")
  }

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: null },
    select: { id: true, tag: true },
  })
  if (!announcement) throw new Error("Announcement not found.")

  const isImportant = announcement.tag === "important"
  const handleAck = isImportant && type === "noted"

  const [reaction, ack] = await Promise.all([
    prisma.announcementReaction.findUnique({
      where: { userId_announcementId_type: { userId, announcementId, type } },
    }),
    handleAck
      ? prisma.announcementAcknowledgment.findUnique({
          where: { userId_announcementId: { userId, announcementId } },
        })
      : Promise.resolve(null),
  ])

  const reactionActive = Boolean(reaction && !reaction.deletedAt)
  const ackActive = Boolean(ack && !ack.deletedAt)
  const isActive = reactionActive || ackActive

  if (isActive) {
    if (reactionActive) {
      await prisma.announcementReaction.update({
        where: { id: reaction!.id },
        data: { deletedAt: nowMalaysia() },
      })
    }
    if (ackActive) {
      await prisma.announcementAcknowledgment.update({
        where: { id: ack!.id },
        data: { deletedAt: nowMalaysia() },
      })
    }
  } else {
    await prisma.announcementReaction.upsert({
      where: { userId_announcementId_type: { userId, announcementId, type } },
      update: { deletedAt: null },
      create: { userId, announcementId, type },
    })
    if (handleAck) {
      await prisma.announcementAcknowledgment.upsert({
        where: { userId_announcementId: { userId, announcementId } },
        update: { deletedAt: null, acknowledgedAt: nowMalaysia() },
        create: { userId, announcementId, acknowledgedAt: nowMalaysia() },
      })
    }
  }
}

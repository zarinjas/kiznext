"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { nowMalaysia } from "@/lib/timezone"
import { ANNOUNCEMENT_REACTIONS, type AnnouncementReactionType } from "@/lib/announcement-meta"

/**
 * Member (ahli/staf) interactions with the announcement feed:
 * marking an announcement read and toggling a reaction. For "important"
 * announcements the "noted" reaction doubles as the acknowledgement that
 * clears the dashboard "Things to Do" task (see `lib/dashboard.ts`).
 */

async function requireMember(): Promise<"ahli" | "staf" | "fellow"> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const role = session.user.role as string
  if (role !== "ahli" && role !== "staf" && role !== "fellow") throw new Error("Forbidden")
  return role as "ahli" | "staf" | "fellow"
}

/** Mark an announcement as read for the signed-in member. */
export async function markAnnouncementRead(announcementId: string) {
  const role = await requireMember()
  const session = await auth()

  const announcement = await prisma.announcement.findFirst({
    where: { id: announcementId, deletedAt: null },
    select: { id: true },
  })
  if (!announcement) throw new Error("Announcement not found.")

  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId: session!.user!.id, announcementId } },
    update: { readAt: nowMalaysia(), deletedAt: null },
    create: { userId: session!.user!.id, announcementId },
  })

  revalidatePath(`/${role}/pengumuman`)
  revalidatePath(`/${role}`)
}

/** Toggle one of 👍 Noted / ❤️ Excited / 🙋 Interested for an announcement. */
export async function toggleAnnouncementReaction(announcementId: string, type: AnnouncementReactionType) {
  const role = await requireMember()
  const session = await auth()
  const userId = session!.user!.id

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
    // Toggle off — soft-delete whatever makes it active today.
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
    // Toggle on — restore/insert the reaction (and acknowledgement for noted).
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

  revalidatePath(`/${role}/pengumuman`)
  revalidatePath(`/${role}`)
}

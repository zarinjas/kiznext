"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import type { AnnouncementReactionType } from "@/lib/announcement-meta"
import { markAnnouncementRead as markReadCore, toggleAnnouncementReaction as toggleCore } from "@/lib/announcements"

/**
 * Member (ahli/staf/fellow) interactions with the announcement feed:
 * marking an announcement read and toggling a reaction. The rules live in
 * `lib/announcements.ts` so the mobile API route shares them.
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
  await markReadCore(session!.user!.id, announcementId)

  revalidatePath(`/${role}/pengumuman`)
  revalidatePath(`/${role}`)
}

/** Toggle one of 👍 Noted / ❤️ Excited / 🙋 Interested for an announcement. */
export async function toggleAnnouncementReaction(announcementId: string, type: AnnouncementReactionType) {
  const role = await requireMember()
  const session = await auth()
  await toggleCore(session!.user!.id, announcementId, type)

  revalidatePath(`/${role}/pengumuman`)
  revalidatePath(`/${role}`)
}

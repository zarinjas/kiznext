"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function createAnnouncement(
  title: string,
  content: string,
  tag: string,
  attachmentUrl: string | null,
  attachmentType: string | null,
  isPinned: boolean,
  scheduledAt: string | null,
  expiresAt: string | null,
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.announcement.create({
    data: {
      title,
      content,
      tag,
      attachmentUrl,
      attachmentType,
      isPinned,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      postedBy: session.user.id,
    },
  })

  revalidatePath(`/${session.user.role}/urus-pengumuman`)
  revalidatePath(`/${session.user.role}/pengumuman`)
}

export async function updateAnnouncement(
  id: string,
  title: string,
  content: string,
  tag: string,
  attachmentUrl: string | null,
  attachmentType: string | null,
  isPinned: boolean,
  scheduledAt: string | null,
  expiresAt: string | null,
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.announcement.update({
    where: { id },
    data: {
      title,
      content,
      tag,
      attachmentUrl,
      attachmentType,
      isPinned,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  revalidatePath(`/${session.user.role}/urus-pengumuman`)
  revalidatePath(`/${session.user.role}/pengumuman`)
}

export async function deleteAnnouncement(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.announcement.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/urus-pengumuman`)
  revalidatePath(`/${session.user.role}/pengumuman`)
}

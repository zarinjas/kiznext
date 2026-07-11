"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function createAnnouncement(title: string, content: string, tag: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.announcement.create({
    data: { title, content, tag, postedBy: session.user.id },
  })

  revalidatePath(`/${session.user.role}/urus-pengumuman`)
  revalidatePath(`/ahli/pengumuman`)
}

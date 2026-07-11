"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function sendChatMessage(message: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  if (!message.trim()) return

  await prisma.communityChatMessage.create({
    data: {
      userId: session.user.id,
      message: message.trim(),
    },
  })

  revalidatePath(`/${session.user.role}/chat`)
}

export async function deleteChatMessage(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.communityChatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), deletedBy: session.user.id },
  })

  revalidatePath(`/${session.user.role}/chat`)
}

export async function getChatMessages() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.communityChatMessage.findMany({
    where: { deletedAt: null },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })
}

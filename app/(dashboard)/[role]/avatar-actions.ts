"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

/** Update the logged-in user's avatar (URL produced by /api/upload). */
export async function updateAvatar(avatarUrl: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: avatarUrl || null },
  })

  revalidatePath(`/${session.user.role}/profile`)
  revalidatePath(`/${session.user.role}/kad-maya`)
  revalidatePath(`/${session.user.role}/lagi`)
  revalidatePath(`/${session.user.role}`)
}

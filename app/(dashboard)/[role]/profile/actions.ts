"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

interface ProfileInput {
  name: string
  email: string
  block: string
  roomNumber: string
  phone: string
  avatarUrl: string
}

export async function updateProfile(data: ProfileInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      email: data.email || null,
      block: data.block || null,
      roomNumber: data.roomNumber || null,
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || null,
    },
  })

  revalidatePath(`/${session.user.role}/profile`)
  revalidatePath(`/${session.user.role}/kad-maya`)
}

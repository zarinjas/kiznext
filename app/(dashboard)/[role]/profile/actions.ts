"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

interface ProfileInput {
  name: string
  email: string
  phone: string
  avatarUrl: string
}

export async function updateProfile(data: ProfileInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Room/block are intentionally NOT editable here — a resident's room is
  // assigned by the KIZ office and read from the bed allocation.
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      avatarUrl: data.avatarUrl || null,
    },
  })

  revalidatePath(`/${session.user.role}/profile`)
  revalidatePath(`/${session.user.role}/kad-maya`)
}

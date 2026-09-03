"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export type GuestHouseFormData = {
  name: string
  description: string
  featuredImage?: string | null
  gallery: string[]
  price?: number | null
  capacity?: number | null
  maxDays?: number | null
  requiresApproval: boolean
}

export async function createGuestHouse(data: GuestHouseFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouse.create({
    data: {
      name: data.name,
      description: data.description,
      featuredImage: data.featuredImage ?? null,
      gallery: data.gallery ?? [],
      price: data.price ?? null,
      capacity: data.capacity ?? null,
      maxDays: data.maxDays ?? null,
      requiresApproval: data.requiresApproval,
    },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function updateGuestHouse(id: string, data: GuestHouseFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouse.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      featuredImage: data.featuredImage ?? null,
      gallery: data.gallery ?? [],
      price: data.price ?? null,
      capacity: data.capacity ?? null,
      maxDays: data.maxDays ?? null,
      requiresApproval: data.requiresApproval,
    },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function deleteGuestHouse(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const active = await prisma.guestHouseBooking.count({
    where: {
      guestHouseId: id,
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
    },
  })
  if (active > 0) {
    throw new Error("This guest house has active bookings and can't be deleted")
  }

  await prisma.guestHouse.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

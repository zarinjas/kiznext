"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export type FacilityFormData = {
  name: string
  blockId: string
  description: string
  featuredImage?: string | null
  gallery: string[]
  price?: number | null
  capacity?: number | null
  timeSlotDuration?: number | null
  maxPerDay?: number | null
  requiresApproval: boolean
}

export async function createFacility(data: FacilityFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facility.create({
    data: {
      name: data.name,
      blockId: data.blockId,
      description: data.description,
      featuredImage: data.featuredImage ?? null,
      gallery: data.gallery ?? [],
      price: data.price ?? null,
      capacity: data.capacity ?? null,
      timeSlotDuration: data.timeSlotDuration ?? null,
      maxPerDay: data.maxPerDay ?? 3,
      requiresApproval: data.requiresApproval,
    },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
}

export async function updateFacility(id: string, data: FacilityFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facility.update({
    where: { id },
    data: {
      name: data.name,
      blockId: data.blockId,
      description: data.description,
      featuredImage: data.featuredImage ?? null,
      gallery: data.gallery ?? [],
      price: data.price ?? null,
      capacity: data.capacity ?? null,
      timeSlotDuration: data.timeSlotDuration ?? null,
      maxPerDay: data.maxPerDay ?? 3,
      requiresApproval: data.requiresApproval,
    },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
}

export async function deleteFacility(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facility.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
}

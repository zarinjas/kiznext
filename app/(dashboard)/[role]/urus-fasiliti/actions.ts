"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"
import type { FacilitySection, FacilityStatus } from "@/app/generated/prisma/client"

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
  categoryId?: string | null
  status: FacilityStatus
}

/**
 * `bookable` is derived from the chosen category's section so the member
 * directory section and the facility's category can never drift apart. A
 * facility with no category yet defaults to bookable (the old behaviour).
 */
async function resolveBookable(categoryId: string | null): Promise<boolean> {
  if (!categoryId) return true
  const category = await prisma.facilityCategory.findUnique({ where: { id: categoryId } })
  return category ? category.section === "bookable" : true
}

export async function createFacility(data: FacilityFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

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
      categoryId: data.categoryId ?? null,
      status: data.status,
      bookable: await resolveBookable(data.categoryId ?? null),
    },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

export async function updateFacility(id: string, data: FacilityFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const existing = await prisma.facility.findUnique({ where: { id } })
  if (!existing) throw new Error("Facility not found")

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
      categoryId: data.categoryId ?? null,
      status: data.status,
      bookable: await resolveBookable(data.categoryId ?? null),
    },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

export async function deleteFacility(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  await prisma.facility.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

// ── Facility categories ──────────────────────────────────────────────────────

export type FacilityCategoryFormData = {
  name: string
  section: FacilitySection
  sortOrder: number
}

export async function createFacilityCategory(data: FacilityCategoryFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const existing = await prisma.facilityCategory.findUnique({
    where: { section_name: { section: data.section, name: data.name.trim() } },
  })
  if (existing && !existing.deletedAt) {
    throw new Error(`A "${data.name}" category already exists in that section.`)
  }
  if (existing?.deletedAt) {
    await prisma.facilityCategory.update({ where: { id: existing.id }, data: { deletedAt: null, sortOrder: data.sortOrder } })
  } else {
    await prisma.facilityCategory.create({
      data: { name: data.name.trim(), section: data.section, sortOrder: data.sortOrder },
    })
  }

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

export async function updateFacilityCategory(id: string, data: FacilityCategoryFormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const clash = await prisma.facilityCategory.findUnique({
    where: { section_name: { section: data.section, name: data.name.trim() } },
  })
  if (clash && clash.id !== id && !clash.deletedAt) {
    throw new Error(`A "${data.name}" category already exists in that section.`)
  }

  await prisma.facilityCategory.update({
    where: { id },
    data: { name: data.name.trim(), section: data.section, sortOrder: data.sortOrder },
  })

  // Keep member facilities' bookable flags in sync with the section move.
  const bookable = data.section === "bookable"
  await prisma.facility.updateMany({
    where: { categoryId: id, deletedAt: null },
    data: { bookable },
  })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

export async function deleteFacilityCategory(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const category = await prisma.facilityCategory.findUnique({
    where: { id },
    include: { facilities: { where: { deletedAt: null }, select: { id: true } } },
  })
  if (!category) throw new Error("Category not found")
  if (category.facilities.length > 0) {
    throw new Error("This category still has facilities assigned to it. Move them first.")
  }

  await prisma.facilityCategory.update({ where: { id }, data: { deletedAt: new Date() } })

  revalidatePath(`/${session.user.role}/urus-fasiliti`)
  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

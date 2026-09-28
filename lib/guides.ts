"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"
import type { GuideCategory } from "@/app/generated/prisma/client"

/**
 * Digital Guide — admin-uploaded PDFs (orientation, rules, programme guides)
 * that residents read as a flipbook or download. Managed from `/urus-panduan`,
 * read from `/panduan`.
 */

export type GuideInput = {
  title: string
  description?: string | null
  category: GuideCategory
  /** Path under public/uploads/guides/ produced by /api/upload. */
  fileUrl: string
  fileSize?: number | null
  coverImage?: string | null
  pageCount?: number | null
  published: boolean
  isPinned: boolean
  sortOrder?: number
}

const ALL_ROLES: Role[] = ["superadmin", "admin_kiz", "pengetua", "fellow", "ahli", "staf"]

async function requireAdminSession() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session
}

function validateInput(data: GuideInput) {
  const title = data.title.trim()
  if (!title) throw new Error("Give the guide a title.")
  const fileUrl = data.fileUrl.trim()
  if (!fileUrl) throw new Error("Upload a PDF first.")
  return {
    title,
    description: data.description?.trim() || null,
    category: data.category,
    fileUrl,
    fileSize: data.fileSize ?? null,
    coverImage: data.coverImage?.trim() || null,
    pageCount: data.pageCount ?? null,
    published: data.published,
    isPinned: data.isPinned,
    sortOrder: data.sortOrder ?? 0,
  }
}

function revalidateAll() {
  for (const role of ALL_ROLES) {
    revalidatePath(`/${role}/panduan`)
    revalidatePath(`/${role}/urus-panduan`)
  }
}

export async function createGuide(data: GuideInput) {
  const session = await requireAdminSession()
  const g = validateInput(data)
  await prisma.guide.create({
    data: { ...g, uploadedById: session.user.id },
  })
  revalidateAll()
}

export async function updateGuide(id: string, data: GuideInput) {
  await requireAdminSession()
  const g = validateInput(data)
  await prisma.guide.update({ where: { id }, data: g })
  revalidateAll()
}

export async function deleteGuide(id: string) {
  await requireAdminSession()
  await prisma.guide.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidateAll()
}

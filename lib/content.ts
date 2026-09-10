"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"
import type { ContentKind } from "@/app/generated/prisma/client"

/**
 * Dashboard content items — emergency contacts and the "Life at KIZ" digital
 * living-guide links. Managed from `/urus-kandungan`.
 */

export type ContentItemInput = {
  kind: ContentKind
  title: string
  subtitle?: string | null
  body?: string | null
  phone?: string | null
  link?: string | null
  sortOrder?: number
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  return session.user.role as Role
}

function validateInput(data: ContentItemInput): ContentItemInput {
  const title = data.title.trim()
  if (!title) throw new Error("Every item needs a title.")
  if (data.kind !== "emergency_contact" && data.kind !== "living_guide") {
    throw new Error("Unknown content type.")
  }
  return {
    kind: data.kind,
    title,
    subtitle: data.subtitle?.trim() || null,
    body: data.body?.trim() || null,
    phone: data.phone?.trim() || null,
    link: data.link?.trim() || null,
    sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder! : 0,
  }
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}`)
  revalidatePath(`/${role}/urus-kandungan`)
}

export async function createContentItem(data: ContentItemInput) {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.contentItem.create({ data: d })
  revalidateFor(role)
}

export async function updateContentItem(id: string, data: ContentItemInput) {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.contentItem.update({ where: { id }, data: d })
  revalidateFor(role)
}

export async function deleteContentItem(id: string) {
  const role = await requireAdmin()
  await prisma.contentItem.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidateFor(role)
}

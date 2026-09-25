"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { ONBOARDING_GRADIENTS, DEFAULT_ONBOARDING_GRADIENT } from "@/lib/onboarding-meta"

/**
 * Onboarding slides — the admin-editable welcome carousel shown once on the
 * mobile app's first launch. Read publicly by `GET /api/v1/onboarding`; managed
 * from `/{role}/urus-onboarding`.
 */

export interface OnboardingSlideView {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  gradient: string
  gradientOpacity: number
  buttonLabel: string | null
  sortOrder: number
  isActive: boolean
}

export interface OnboardingSlideInput {
  title: string
  body?: string | null
  imageUrl?: string | null
  gradient?: string | null
  gradientOpacity?: number
  buttonLabel?: string | null
}

function toView(s: {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  gradient: string
  gradientOpacity: number
  buttonLabel: string | null
  sortOrder: number
  isActive: boolean
}): OnboardingSlideView {
  return {
    id: s.id,
    title: s.title,
    body: s.body,
    imageUrl: s.imageUrl,
    gradient: s.gradient,
    gradientOpacity: s.gradientOpacity,
    buttonLabel: s.buttonLabel,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
  }
}

/** Public: active slides in display order, for the mobile first-launch carousel. */
export async function getOnboardingSlides(): Promise<OnboardingSlideView[]> {
  const rows = await prisma.onboardingSlide.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return rows.map(toView)
}

/** Admin: every slide, including inactive ones. */
export async function getOnboardingAdminData(): Promise<OnboardingSlideView[]> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const rows = await prisma.onboardingSlide.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })
  return rows.map(toView)
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session.user.role as Role
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}/urus-onboarding`)
}

function validateInput(data: OnboardingSlideInput) {
  const title = data.title.trim()
  if (!title) throw new Error("Give this slide a title.")
  const gradient = data.gradient?.trim() || DEFAULT_ONBOARDING_GRADIENT
  if (!ONBOARDING_GRADIENTS.some((g) => g.key === gradient)) throw new Error("Unknown gradient.")
  const imageUrl = data.imageUrl?.trim() || null
  if (imageUrl && !imageUrl.startsWith("/uploads/") && !/^https?:\/\//.test(imageUrl)) {
    throw new Error("Upload the image first.")
  }
  const gradientOpacity = Math.max(0, Math.min(100, Math.round(data.gradientOpacity ?? 60)))
  return {
    title,
    body: data.body?.trim() || null,
    imageUrl,
    gradient,
    gradientOpacity,
    buttonLabel: data.buttonLabel?.trim() || null,
  }
}

export async function createOnboardingSlide(data: OnboardingSlideInput): Promise<void> {
  const role = await requireAdmin()
  const d = validateInput(data)
  const last = await prisma.onboardingSlide.findFirst({
    where: { deletedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  await prisma.onboardingSlide.create({ data: { ...d, sortOrder: (last?.sortOrder ?? 0) + 1 } })
  revalidateFor(role)
}

export async function updateOnboardingSlide(id: string, data: OnboardingSlideInput): Promise<void> {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.onboardingSlide.update({ where: { id }, data: d })
  revalidateFor(role)
}

export async function setOnboardingSlideActive(id: string, isActive: boolean): Promise<void> {
  const role = await requireAdmin()
  await prisma.onboardingSlide.update({ where: { id }, data: { isActive } })
  revalidateFor(role)
}

export async function deleteOnboardingSlide(id: string): Promise<void> {
  const role = await requireAdmin()
  await prisma.onboardingSlide.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidateFor(role)
}

/** Move a slide one slot up/down by renumbering the whole list. */
export async function moveOnboardingSlide(id: string, direction: "up" | "down"): Promise<void> {
  const role = await requireAdmin()
  const slides = await prisma.onboardingSlide.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  })
  const index = slides.findIndex((s) => s.id === id)
  if (index === -1) throw new Error("Slide not found.")
  const swapWith = direction === "up" ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= slides.length) return

  const reordered = [...slides]
  ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]

  await prisma.$transaction(
    reordered.map((s, i) => prisma.onboardingSlide.update({ where: { id: s.id }, data: { sortOrder: i + 1 } }))
  )
  revalidateFor(role)
}

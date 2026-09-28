"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"
import { normalizeSocialIcon } from "@/lib/social-meta"

/**
 * "Stay Connected" — the outbound social-links section on the member dashboard.
 *
 * Section-level config (enabled / title / subtitle) lives in `app_settings`;
 * the individual links are `social_links` rows so admins can relabel, reorder,
 * toggle and add more without a schema change. Managed from `/urus-sosial`.
 */

const ENABLED_KEY = "stay_connected_enabled"
const TITLE_KEY = "stay_connected_title"
const SUBTITLE_KEY = "stay_connected_subtitle"

const DEFAULT_STAY_CONNECTED_TITLE = "Stay Connected"
const DEFAULT_STAY_CONNECTED_SUBTITLE =
  "Follow MyKIZ for the latest announcements, events and student activities."

export interface SocialLinkView {
  id: string
  label: string
  description: string | null
  url: string
  icon: string
  sortOrder: number
  isActive: boolean
}

export interface StayConnectedSection {
  enabled: boolean
  title: string
  subtitle: string
  links: SocialLinkView[]
}

export type SocialLinkInput = {
  label: string
  description?: string | null
  url: string
  icon?: string | null
}

type LinkRow = {
  id: string
  label: string
  description: string | null
  url: string
  icon: string
  sortOrder: number
  isActive: boolean
}

function toView(l: LinkRow): SocialLinkView {
  return {
    id: l.id,
    label: l.label,
    description: l.description,
    url: l.url,
    icon: normalizeSocialIcon(l.icon),
    sortOrder: l.sortOrder,
    isActive: l.isActive,
  }
}

async function readSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

/**
 * The section as rendered on the dashboard: only active links with a URL, in
 * display order. Never throws — safe to call from the member home.
 */
export async function getStayConnectedSection(): Promise<StayConnectedSection> {
  const [enabled, title, subtitle, rows] = await Promise.all([
    readSetting(ENABLED_KEY),
    readSetting(TITLE_KEY),
    readSetting(SUBTITLE_KEY),
    prisma.socialLink.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ])

  return {
    enabled: enabled === null ? true : enabled !== "false",
    title: title?.trim() || DEFAULT_STAY_CONNECTED_TITLE,
    subtitle: subtitle?.trim() || DEFAULT_STAY_CONNECTED_SUBTITLE,
    links: rows.filter((l) => l.url.trim().length > 0).map(toView),
  }
}

/** Everything the admin screen needs, including inactive links. Admin-only. */
export async function getStayConnectedAdminData(): Promise<StayConnectedSection> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const [enabled, title, subtitle, rows] = await Promise.all([
    readSetting(ENABLED_KEY),
    readSetting(TITLE_KEY),
    readSetting(SUBTITLE_KEY),
    prisma.socialLink.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ])

  return {
    enabled: enabled === null ? true : enabled !== "false",
    title: title?.trim() || DEFAULT_STAY_CONNECTED_TITLE,
    subtitle: subtitle?.trim() || DEFAULT_STAY_CONNECTED_SUBTITLE,
    links: rows.map(toView),
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session.user.role as Role
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}`)
  revalidatePath(`/${role}/urus-sosial`)
}

function validateUrl(raw: string): string {
  const value = raw.trim()
  if (!value) throw new Error("Every link needs a URL.")
  const url = /^(https?:|mailto:|tel:)/i.test(value) ? value : `https://${value}`
  try {
    const parsed = new URL(url)
    if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) throw new Error()
  } catch {
    throw new Error("That URL doesn't look right — try https://example.com.")
  }
  return url
}

function validateInput(data: SocialLinkInput) {
  const label = data.label.trim()
  if (!label) throw new Error("Give this link a label.")
  return {
    label,
    description: data.description?.trim() || null,
    url: validateUrl(data.url),
    icon: normalizeSocialIcon(data.icon),
  }
}

export async function saveStayConnectedSection(input: {
  enabled: boolean
  title: string
  subtitle: string
}): Promise<void> {
  const role = await requireAdmin()
  const title = input.title.trim()
  const subtitle = input.subtitle.trim()
  if (!title) throw new Error("The section needs a title.")

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: ENABLED_KEY },
      update: { value: input.enabled ? "true" : "false" },
      create: { key: ENABLED_KEY, value: input.enabled ? "true" : "false" },
    }),
    prisma.appSetting.upsert({
      where: { key: TITLE_KEY },
      update: { value: title },
      create: { key: TITLE_KEY, value: title },
    }),
    prisma.appSetting.upsert({
      where: { key: SUBTITLE_KEY },
      update: { value: subtitle },
      create: { key: SUBTITLE_KEY, value: subtitle },
    }),
  ])

  revalidateFor(role)
}

export async function createSocialLink(data: SocialLinkInput): Promise<void> {
  const role = await requireAdmin()
  const d = validateInput(data)
  const last = await prisma.socialLink.findFirst({
    where: { deletedAt: null },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })
  await prisma.socialLink.create({ data: { ...d, sortOrder: (last?.sortOrder ?? 0) + 1 } })
  revalidateFor(role)
}

export async function updateSocialLink(id: string, data: SocialLinkInput): Promise<void> {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.socialLink.update({ where: { id }, data: d })
  revalidateFor(role)
}

export async function setSocialLinkActive(id: string, isActive: boolean): Promise<void> {
  const role = await requireAdmin()
  await prisma.socialLink.update({ where: { id }, data: { isActive } })
  revalidateFor(role)
}

export async function deleteSocialLink(id: string): Promise<void> {
  const role = await requireAdmin()
  await prisma.socialLink.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidateFor(role)
}

/** Move a link one slot up/down by renumbering the whole list. */
export async function moveSocialLink(id: string, direction: "up" | "down"): Promise<void> {
  const role = await requireAdmin()
  const links = await prisma.socialLink.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  })
  const index = links.findIndex((l) => l.id === id)
  if (index === -1) throw new Error("Link not found.")
  const swapWith = direction === "up" ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= links.length) return

  const reordered = [...links]
  ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]

  await prisma.$transaction(
    reordered.map((l, i) => prisma.socialLink.update({ where: { id: l.id }, data: { sortOrder: i + 1 } }))
  )
  revalidateFor(role)
}

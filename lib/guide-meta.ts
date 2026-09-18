import type { GuideCategory } from "@/app/generated/prisma/client"
import { color } from "@/lib/theme"

/**
 * Category meta for the Digital Guide library. Single source of truth so the
 * member cards, filter tabs and admin form all render a category identically.
 */

export interface GuideTone {
  main: string
  soft: string
  ink: string
}

export interface GuideCategoryMeta {
  label: string
  icon: string
  hint: string
  tone: GuideTone
}

export const GUIDE_CATEGORIES: GuideCategory[] = ["orientation", "rules", "program", "other"]

export const GUIDE_CATEGORY_META: Record<GuideCategory, GuideCategoryMeta> = {
  orientation: {
    label: "Orientation",
    icon: "explore",
    hint: "Welcome pack and orientation guide for new residents.",
    tone: { main: color.brand[600], soft: color.brand[50], ink: color.brand[700] },
  },
  rules: {
    label: "Rules & Regulations",
    icon: "gavel",
    hint: "College rules, etiquette and what's expected of every resident.",
    tone: { main: color.danger.main, soft: color.danger.soft, ink: color.danger.ink },
  },
  program: {
    label: "Programme Guide",
    icon: "event_note",
    hint: "Programme schedules, handbooks and activity guides.",
    tone: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] },
  },
  other: {
    label: "Other",
    icon: "description",
    hint: "Any other document worth keeping in the resident library.",
    tone: { main: color.ink[500], soft: color.canvasSunk, ink: color.ink[700] },
  },
}

export function guideCategoryMeta(category: string): GuideCategoryMeta {
  return GUIDE_CATEGORY_META[category as GuideCategory] ?? GUIDE_CATEGORY_META.other
}

/** Human-readable byte size, e.g. 2.4 MB. */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

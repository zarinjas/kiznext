import { color } from "@/lib/theme"

/**
 * Office card meta. Single source of truth for the category-chip tone palette
 * so the student card and the admin editor render the same colours.
 */

export interface OfficeToneSet {
  main: string
  soft: string
  ink: string
}

export const OFFICE_TONES: Record<string, OfficeToneSet> = {
  brand: { main: color.brand[600], soft: color.brand[50], ink: color.brand[700] },
  accent: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] },
  success: color.success,
  info: color.info,
  neutral: { main: color.ink[500], soft: color.canvasSunk, ink: color.ink[700] },
}

export const OFFICE_TONE_OPTIONS: { value: string; label: string }[] = [
  { value: "brand", label: "Teal" },
  { value: "info", label: "Blue" },
  { value: "success", label: "Green" },
  { value: "accent", label: "Lavender" },
  { value: "neutral", label: "Grey" },
]

export function officeTone(value: string | null | undefined): OfficeToneSet {
  return (value && OFFICE_TONES[value]) || OFFICE_TONES.brand
}

/** Display title for an office — English name when set, else the canonical name. */
export function officeTitle(office: { name: string; nameEn?: string | null }): string {
  return office.nameEn?.trim() || office.name
}

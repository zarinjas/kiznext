import { color } from "./theme/tokens"

/**
 * Category + reaction meta for announcements. Single source of truth so cards,
 * detail dialogs and filters all render a tag the same way (icon, colour, label).
 */

export interface AnnouncementTone {
  main: string
  soft: string
  ink: string
}

export interface AnnouncementTagMeta {
  label: string
  icon: string
  tone: AnnouncementTone
}

const tone: Record<"brand" | "danger" | "accent" | "success" | "neutral", AnnouncementTone> = {
  brand: { main: color.brand[600], soft: color.brand[50], ink: color.brand[700] },
  danger: color.danger,
  accent: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] },
  success: color.success,
  neutral: { main: color.ink[500], soft: color.canvasSunk, ink: color.ink[700] },
}

/** Colour/icon recipe per announcement category (matches the admin form values). */
const tagMeta: Record<string, AnnouncementTagMeta> = {
  general: { label: "General", icon: "campaign", tone: tone.brand },
  important: { label: "Important", icon: "notification_important", tone: tone.danger },
  event: { label: "Event", icon: "event", tone: tone.accent },
  sports: { label: "Sports", icon: "sports_soccer", tone: tone.success },
}

export function announcementTagMeta(tag: string): AnnouncementTagMeta {
  const known = tagMeta[tag]
  if (known) return known
  return {
    label: tag.charAt(0).toUpperCase() + tag.slice(1),
    icon: "campaign",
    tone: tone.neutral,
  }
}

export function announcementTagTone(tag: string): AnnouncementTone {
  return announcementTagMeta(tag).tone
}

// ── Reactions ────────────────────────────────────────────────────────────────
export type AnnouncementReactionType = "noted" | "excited" | "interested"

export interface AnnouncementReactionMeta {
  type: AnnouncementReactionType
  /** Emoji glyph shown on pills. */
  emoji: string
  label: string
  /** One-line prompt used in the detail dialog, e.g. "I'm interested in this". */
  hint: string
}

export const ANNOUNCEMENT_REACTIONS: AnnouncementReactionMeta[] = [
  { type: "noted", emoji: "👍", label: "Noted", hint: "Noted — I've read this." },
  { type: "excited", emoji: "❤️", label: "Excited", hint: "Excited about this!" },
  { type: "interested", emoji: "🙋", label: "I'm interested", hint: "I'm interested in this." },
]

export function reactionMeta(type: string): AnnouncementReactionMeta {
  return ANNOUNCEMENT_REACTIONS.find((r) => r.type === type) ?? ANNOUNCEMENT_REACTIONS[0]
}

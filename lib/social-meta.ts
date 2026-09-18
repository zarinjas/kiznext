/**
 * Icon metadata for the "Stay Connected" social links.
 *
 * `icon` on a `SocialLink` stores one of these keys. Brand keys (Instagram,
 * TikTok, …) render from inline SVG in `components/shared/social-icon.tsx`
 * because Material Symbols carries no brand logos; the rest fall back to a
 * Material Symbols glyph via `material`.
 */

export interface SocialIconMeta {
  label: string
  /** Material Symbols Rounded glyph name — used when there is no brand SVG. */
  material?: string
}

export const SOCIAL_ICON_META: Record<string, SocialIconMeta> = {
  website: { label: "Official Website", material: "public" },
  instagram: { label: "Instagram" },
  tiktok: { label: "TikTok" },
  facebook: { label: "Facebook" },
  youtube: { label: "YouTube" },
  whatsapp: { label: "WhatsApp" },
  telegram: { label: "Telegram" },
  x: { label: "X (Twitter)" },
  linkedin: { label: "LinkedIn" },
  email: { label: "Email", material: "mail" },
  phone: { label: "Phone", material: "call" },
  link: { label: "Link", material: "link" },
}

/** Order shown in the admin icon picker. */
export const SOCIAL_ICON_KEYS = [
  "website",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "whatsapp",
  "telegram",
  "x",
  "linkedin",
  "email",
  "phone",
  "link",
] as const

export const DEFAULT_SOCIAL_ICON = "link"

export function socialIconLabel(key: string): string {
  return SOCIAL_ICON_META[key]?.label ?? SOCIAL_ICON_META[DEFAULT_SOCIAL_ICON].label
}

/** Coerce an unknown/legacy value to a known icon key. */
export function normalizeSocialIcon(key: string | null | undefined): string {
  return key && SOCIAL_ICON_META[key] ? key : DEFAULT_SOCIAL_ICON
}

import { color } from "@/lib/theme"

/**
 * Community-chat meta: role badges shown on bubbles, the quick-reaction and
 * quick-emoji menus, report reasons, and the static community guidelines copy.
 * Single source of truth so the message rows, composer, right rail and the
 * moderation dialog all agree on labels and tints.
 */

export interface ChatTone {
  main: string
  soft: string
  ink: string
}

export interface ChatRoleBadge {
  label: string
  tone: ChatTone
}

const tone = {
  brand: { main: color.brand[600], soft: color.brand[50], ink: color.brand[700] },
  accent: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] },
  success: color.success,
  info: color.info,
  danger: color.danger,
  neutral: { main: color.ink[500], soft: color.canvasSunk, ink: color.ink[700] },
} as const

/**
 * How a message sender's role is shown on their bubble. `ahli` = Resident
 * (the everyday voice of the room), `staf`/`fellow` = Staff/Fellow, the office
 * roles stay official so residents can tell them apart at a glance.
 */
export const CHAT_ROLE_BADGES: Record<string, ChatRoleBadge> = {
  ahli: { label: "Resident", tone: tone.neutral },
  staf: { label: "Staff", tone: tone.info },
  fellow: { label: "Fellow", tone: tone.accent },
  pengetua: { label: "Principal", tone: tone.accent },
  admin_kiz: { label: "Admin KIZ", tone: tone.brand },
  superadmin: { label: "Super Admin", tone: tone.danger },
}

export function chatRoleBadge(role: string): ChatRoleBadge {
  return (
    CHAT_ROLE_BADGES[role] ?? {
      label: role.replace(/_/g, " "),
      tone: tone.neutral,
    }
  )
}

/** Emojis offered when reacting to a message (toggle on tap). */
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

/** A slightly wider palette used by the composer's emoji picker. */
export const CHAT_QUICK_EMOJIS = [
  "🙂", "😄", "😂", "🤣", "😉", "😍", "😘", "😅",
  "🤔", "😮", "😢", "😭", "🙌", "👏", "🙏", "💪",
  "🔥", "✨", "🎉", "🎊", "❤️", "💯", "👍", "👎",
]

export interface ChatGuideline {
  icon: string
  title: string
  body: string
}

/**
 * Static community guidelines (English UI). The rail lists them all; the top
 * of the chat shows the first three pinned. Admin editing is a later round.
 */
export const COMMUNITY_GUIDELINES: ChatGuideline[] = [
  {
    icon: "favorite",
    title: "Be kind & respectful",
    body: "Every resident deserves a safe space. No harassment, hate speech or personal attacks — disagree without being disagreeable.",
  },
  {
    icon: "record_voice_over",
    title: "Stay on topic",
    body: "Keep conversations college-related. No spam, chain messages, promotions or off-college selling.",
  },
  {
    icon: "lock",
    title: "Protect privacy",
    body: "Never share another resident's photo, contact or room details without their permission. No doxxing, ever.",
  },
  {
    icon: "campaign",
    title: "No false alarms",
    body: "Don't post emergency calls that aren't real — it wastes the office's and security's time and can cause panic.",
  },
  {
    icon: "support_agent",
    title: "Official matters → Helpdesk",
    body: "Complaints, damage reports and requests that need the KIZ office should go through Helpdesk, not the chat.",
  },
]

/** First guidelines, pinned at the top of the room. */
export const PINNED_GUIDELINES = COMMUNITY_GUIDELINES.slice(0, 3)

/** Compact one-liners for the pinned strip. */
export const PINNED_GUIDELINE_STRIP = [
  "Be kind & respectful",
  "Stay on topic",
  "No sharing others' private info",
]

export interface ChatReportReason {
  value: string
  label: string
}

export const CHAT_REPORT_REASONS: ChatReportReason[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Something else" },
]

/** How long since a user's last heartbeat before they're considered offline. */
export const ONLINE_WINDOW_MS = 120_000

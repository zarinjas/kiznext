import { color } from "./theme/tokens"

/** Community-chat meta: role badges, quick reactions and report reasons. */

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

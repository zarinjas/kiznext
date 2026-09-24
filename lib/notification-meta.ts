import type { Role } from "@/lib/rbac"

/**
 * Pure notification metadata + view types. Kept free of `use server` so both
 * the admin client components and the server actions in `lib/notifications.ts`
 * can import it. No Prisma / Next imports here.
 */

export type NotificationChannel = "in_app" | "push" | "email"

export type NotificationAudience = "all" | "role" | "selected"

export const NOTIFICATION_CHANNELS: NotificationChannel[] = ["in_app", "push", "email"]

export interface NotificationChannelMeta {
  key: NotificationChannel
  label: string
  description: string
  icon: string
}

export const CHANNEL_META: Record<NotificationChannel, NotificationChannelMeta> = {
  in_app: {
    key: "in_app",
    label: "In-app",
    description: "Shows in the notification bell (web) and the Notifications screen (mobile).",
    icon: "notifications",
  },
  push: {
    key: "push",
    label: "Push",
    description: "Sends a device push notification through the mobile app (APNs / Firebase).",
    icon: "phone_iphone",
  },
  email: {
    key: "email",
    label: "Email",
    description: "Emails everyone who has an email address on file.",
    icon: "mail",
  },
}

export interface NotificationAudienceMeta {
  key: NotificationAudience
  label: string
  description: string
  icon: string
}

export const AUDIENCE_META: Record<NotificationAudience, NotificationAudienceMeta> = {
  all: {
    key: "all",
    label: "Everyone",
    description: "Every active account.",
    icon: "groups",
  },
  role: {
    key: "role",
    label: "By role",
    description: "Everyone with a chosen role (students, staff, fellows…).",
    icon: "badge",
  },
  selected: {
    key: "selected",
    label: "Specific people",
    description: "Pick individual residents by name or matric number.",
    icon: "person_search",
  },
}

/** A single notification row as rendered in the bell / mobile list. */
export interface NotificationView {
  id: string
  title: string
  body: string
  link: string | null
  createdAt: string
  read: boolean
}

/** One admin history row. */
export interface NotificationAdminRow {
  id: string
  title: string
  body: string
  link: string | null
  audience: NotificationAudience
  audienceRole: Role | null
  channels: NotificationChannel[]
  recipientCount: number
  pushSentCount: number
  emailSentCount: number
  failedCount: number
  sentByName: string
  createdAt: string
}

/** A user the admin can pick as a specific recipient. */
export interface NotificationUserOption {
  id: string
  name: string
  matricId: string
  role: Role
  email: string | null
}

/** Normalise a stored string[] into known channels. */
export function parseChannels(values: string[] | null | undefined): NotificationChannel[] {
  if (!values) return []
  return NOTIFICATION_CHANNELS.filter((c) => values.includes(c))
}

export function channelLabel(key: NotificationChannel): string {
  return CHANNEL_META[key]?.label ?? key
}

export function audienceLabel(
  audience: NotificationAudience,
  role: Role | null,
  roleLabel: (r: Role) => string
): string {
  if (audience === "all") return "Everyone"
  if (audience === "role") return role ? `Role · ${roleLabel(role)}` : "By role"
  return "Specific people"
}

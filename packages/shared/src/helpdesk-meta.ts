import { color } from "./theme/tokens"

/**
 * Helpdesk category + ticket-reference meta. Shared by web and mobile so the
 * picker, ticket cards and admin inbox render a category identically.
 */

export type HelpdeskCategory =
  | "accommodation_room"
  | "room_change"
  | "maintenance_repair"
  | "facilities_booking"
  | "cleanliness_waste"
  | "internet_technology"
  | "safety_security"
  | "payment_charges"
  | "student_welfare"
  | "general_enquiry"

export interface HelpdeskTone {
  main: string
  soft: string
  ink: string
}

export interface HelpdeskCategoryMeta {
  value: HelpdeskCategory
  label: string
  icon: string
  tone: HelpdeskTone
  hint: string
}

const tone = {
  brand: { main: color.brand[600], soft: color.brand[50], ink: color.brand[700] },
  accent: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] },
  success: color.success,
  warning: color.warning,
  danger: color.danger,
  info: color.info,
  neutral: { main: color.ink[500], soft: color.canvasSunk, ink: color.ink[700] },
} as const

export const HELPDESK_CATEGORIES: HelpdeskCategoryMeta[] = [
  { value: "accommodation_room", label: "Accommodation & Room", icon: "meeting_room", tone: tone.brand, hint: "Room placement, roommates, keys and furniture." },
  { value: "room_change", label: "Room Change Request", icon: "swap_horiz", tone: tone.info, hint: "Apply to move to a different room or block." },
  { value: "maintenance_repair", label: "Maintenance & Repair", icon: "handyman", tone: tone.warning, hint: "Leaks, wiring, broken fittings, AC or lift faults." },
  { value: "facilities_booking", label: "Facilities & Booking", icon: "event_available", tone: tone.info, hint: "Halls, sports courts and shared facility bookings." },
  { value: "cleanliness_waste", label: "Cleanliness & Waste", icon: "cleaning_services", tone: tone.success, hint: "Common areas, waste collection and pest issues." },
  { value: "internet_technology", label: "Internet & Technology", icon: "wifi", tone: tone.accent, hint: "WiFi, network or portal sign-in problems." },
  { value: "safety_security", label: "Safety & Security", icon: "security", tone: tone.danger, hint: "Security incidents, access and suspicious activity." },
  { value: "payment_charges", label: "Payment & Charges", icon: "payments", tone: tone.brand, hint: "Fees, charges, receipts and payment status." },
  { value: "student_welfare", label: "Student Welfare", icon: "favorite", tone: tone.warning, hint: "Well-being, counselling referrals, personal matters." },
  { value: "general_enquiry", label: "General Enquiry", icon: "help", tone: tone.neutral, hint: "Anything else — a quick question for the KIZ office." },
]

export function helpdeskCategoryMeta(value: string): HelpdeskCategoryMeta {
  const known = HELPDESK_CATEGORIES.find((c) => c.value === value)
  if (known) return known
  return HELPDESK_CATEGORIES[HELPDESK_CATEGORIES.length - 1]
}

/** Human ticket reference, e.g. `HD-1024`. */
export function ticketRef(displayId: number): string {
  return `HD-${displayId}`
}

/** `Block K18A, Room 211` when both are stored, else whichever exists. */
export function helpdeskLocationLabel(block: string | null, detail: string | null): string | null {
  if (!block && !detail) return null
  if (block && detail) return `Block ${block}, Room ${detail}`
  if (block) return `Block ${block}`
  return detail
}

export function isHelpdeskActive(status: string): boolean {
  return (
    status === "submitted" ||
    status === "under_review" ||
    status === "in_progress" ||
    status === "more_info_required"
  )
}

export function canReplyToTicket(status: string): boolean {
  return status !== "closed"
}

export function isHelpdeskDone(status: string): boolean {
  return status === "resolved" || status === "closed"
}

export const HELPDESK_CHANNELS: Record<"live" | "ticket", { value: "live" | "ticket"; label: string; icon: string; tagline: string }> = {
  live: {
    value: "live",
    label: "Live Chat",
    icon: "forum",
    tagline: "Quick questions — chat with the office while it's open.",
  },
  ticket: {
    value: "ticket",
    label: "Support Ticket",
    icon: "assignment",
    tagline: "Formal requests & applications you can track.",
  },
}

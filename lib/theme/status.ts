import { color } from "./tokens"

/**
 * One source of truth: every domain status → semantic tone.
 * Covers BookingStatus, GuestHouseBookingStatus, PaymentStatus,
 * HelpdeskStatus, LostFoundStatus, and Parcel's plain-string status.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral"

const toneByStatus: Record<string, StatusTone> = {
  // shared booking lifecycle
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "danger",
  // guest house lifecycle
  checked_in: "success",
  checked_out: "neutral",
  // payment (manual flag — never a gateway)
  unpaid: "warning",
  paid_manual: "success",
  // helpdesk
  open: "info",
  in_progress: "warning",
  closed: "neutral",
  // lost & found
  lost: "info",
  found: "success",
  claimed: "neutral",
  // parcel (plain string in schema)
  arrived: "success",
  collected: "neutral",
  // user roles (urus-pengguna)
  superadmin: "danger",
  admin_kiz: "warning",
  pengetua: "info",
  ahli: "neutral",
}

const labelByStatus: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  checked_in: "Checked in",
  checked_out: "Checked out",
  unpaid: "Unpaid",
  paid_manual: "Paid (manual)",
  open: "Open",
  in_progress: "In progress",
  closed: "Closed",
  lost: "Lost",
  found: "Found",
  claimed: "Claimed",
  arrived: "Arrived",
  collected: "Collected",
  // user roles
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Principal",
  ahli: "Student",
}

export function statusTone(status: string): StatusTone {
  return toneByStatus[status] ?? "neutral"
}

export function statusLabel(status: string): string {
  return labelByStatus[status] ?? status.replace(/_/g, " ")
}

export interface ToneColors {
  main: string
  soft: string
  ink: string
}

export function toneColors(tone: StatusTone): ToneColors {
  return color[tone]
}

// ── Room-selection seat states ───────────────────────────────────────────────
// The six visual states of a bed/room slot in the picker. Colours come from the
// token palette + accent ramp — never hardcoded at the call site.

export type SeatState =
  | "available"
  | "selected_me"
  | "partial"
  | "full"
  | "maintenance"
  | "closed"

export interface SeatColors {
  /** Border colour of the seat glyph. */
  border: string
  /** Fill colour. */
  fill: string
  /** Foreground (glyph / label) colour. */
  ink: string
  /** Whether the slot is interactive. */
  selectable: boolean
  /** Human label for the legend. */
  label: string
}

const seatColors: Record<SeatState, SeatColors> = {
  available: {
    border: color.borderStrong,
    fill: color.canvas,
    ink: color.ink[500],
    selectable: true,
    label: "Available",
  },
  selected_me: {
    border: color.accent[600],
    fill: color.accent[100],
    ink: color.accent[700],
    selectable: true,
    label: "Your bed",
  },
  partial: {
    border: color.success.main,
    fill: color.success.soft,
    ink: color.success.ink,
    selectable: true,
    label: "1 bed left",
  },
  full: {
    border: color.brand[600],
    fill: color.brand[600],
    ink: "#FFFFFF",
    selectable: false,
    label: "Full",
  },
  maintenance: {
    border: color.warning.main,
    fill: color.warning.soft,
    ink: color.warning.ink,
    selectable: false,
    label: "Maintenance",
  },
  closed: {
    border: color.border,
    fill: color.canvasSunk,
    ink: color.ink[300],
    selectable: false,
    label: "Closed",
  },
}

export function seatTone(state: SeatState): SeatColors {
  return seatColors[state]
}

export const SEAT_LEGEND: SeatState[] = [
  "available",
  "selected_me",
  "partial",
  "full",
  "maintenance",
  "closed",
]

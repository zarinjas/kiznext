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

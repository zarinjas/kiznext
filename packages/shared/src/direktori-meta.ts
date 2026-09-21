import { color } from "./theme/tokens"

/** Everything that describes a destination kind — one source of truth. */

export type DestinationType =
  | "block"
  | "facility"
  | "office"
  | "room"
  | "hall"
  | "seminar"
  | "meeting"
  | "admin"

export const TYPE_OPTIONS: DestinationType[] = [
  "block",
  "facility",
  "office",
  "room",
  "hall",
  "seminar",
  "meeting",
  "admin",
]

export const TYPE_LABELS: Record<DestinationType, string> = {
  block: "Residence block",
  facility: "Facility",
  office: "Office",
  room: "Room",
  hall: "Hall",
  seminar: "Seminar room",
  meeting: "Meeting room",
  admin: "Admin",
}

export const TYPE_ICONS: Record<DestinationType, string> = {
  block: "apartment",
  facility: "meeting_room",
  office: "domain",
  room: "door_front",
  hall: "theater_comedy",
  seminar: "co_present",
  meeting: "forum",
  admin: "admin_panel_settings",
}

export interface Tone {
  main: string
  soft: string
  ink: string
}

const brandTone: Tone = { main: color.brand[600], soft: color.brand[50], ink: color.brand[800] }
const accentTone: Tone = { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] }

export const TYPE_TONES: Record<DestinationType, Tone> = {
  block: color.neutral,
  facility: color.info,
  office: brandTone,
  room: color.neutral,
  hall: accentTone,
  seminar: color.warning,
  meeting: color.info,
  admin: color.danger,
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type as DestinationType] ?? type
}

export function typeIcon(type: string): string {
  return TYPE_ICONS[type as DestinationType] ?? "place"
}

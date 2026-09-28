import { color } from "./theme/tokens"

/**
 * Lost & Found meta. Single source of truth for the two report directions
 * (lost / found) and the KIZ location picker.
 */

export type LostFoundStatus = "lost" | "found" | "claimed"

export interface LostFoundTone {
  main: string
  soft: string
  ink: string
}

export interface LostFoundTypeMeta {
  value: Exclude<LostFoundStatus, "claimed">
  title: string
  hint: string
  icon: string
  tone: LostFoundTone
  verb: string
  whenLabel: string
  locationLabel: string
}

const tone = {
  info: { main: color.info.main, soft: color.info.soft, ink: color.info.ink },
  success: { main: color.success.main, soft: color.success.soft, ink: color.success.ink },
} as const

export const LOST_FOUND_TYPES: LostFoundTypeMeta[] = [
  {
    value: "lost",
    title: "I Lost Something",
    hint: "Tell us what slipped away — the community can keep an eye out.",
    icon: "search_off",
    tone: tone.info,
    verb: "Lost",
    whenLabel: "When did you lose it?",
    locationLabel: "Where did you lose it?",
  },
  {
    value: "found",
    title: "I Found Something",
    hint: "Let the owner find it — report what you picked up.",
    icon: "volunteer_activism",
    tone: tone.success,
    verb: "Found",
    whenLabel: "When did you find it?",
    locationLabel: "Where did you find it?",
  },
]

export function lostFoundTypeMeta(status: string): LostFoundTypeMeta {
  if (status === "claimed") return LOST_FOUND_TYPES[1]
  return LOST_FOUND_TYPES.find((t) => t.value === status) ?? LOST_FOUND_TYPES[0]
}

export const KIZ_LOCATIONS: string[] = [
  "Block K18A",
  "Block K18B",
  "Block K18C",
  "Block K18D",
  "Block K19A",
  "Block K19B",
  "Block K19C",
  "Block K19D",
  "Cafeteria",
  "Dewan Sutera",
  "Seminar Room",
  "Meeting Room",
  "Surau",
  "Laundry Room",
  "Dapur Siswa",
  "Futsal Court",
  "Sick Bay",
  "Parcel Locker",
  "Study Area",
  "KIZ Administration Office",
  "UKM Real Estate Office",
  "Parking Area",
  "Outside / Campus Grounds",
]

/** Select value that reveals the free-text "other location" field. */
export const OTHER_LOCATION = "__other"

/** Human line for an item card, e.g. "Lost on 10 Sep · around 6:30 PM". */
export function lostFoundWhenLabel(status: string, date: Date | null, time: string | null): string {
  if (!date) return ""
  const d = new Date(date)
  const datePart = d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
  const verb = lostFoundTypeMeta(status).verb
  return time ? `${verb} on ${datePart} · around ${approxTimeLabel(time)}` : `${verb} on ${datePart}`
}

/** Convert a 24h "HH:MM" string into a 12h "6:30 PM" label. */
export function approxTimeLabel(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":").map(Number)
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm
  const h = hRaw % 12 || 12
  const m = String(mRaw).padStart(2, "0")
  const suffix = hRaw < 12 ? "AM" : "PM"
  return `${h}:${m} ${suffix}`
}

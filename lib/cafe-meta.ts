/**
 * KIZ Cafe smart-ordering meta. Pure helpers + types shared by the member
 * ordering UI, the admin menu manager and the WhatsApp hand-off. No server
 * imports here so client components can use it freely.
 */

/** Opening hours for one weekday. Times are 24h "HH:MM" on the KL clock. */
export interface CafeDayHours {
  closed: boolean
  open: string
  close: string
}

export type CafeWeekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

export type CafeSchedule = Record<CafeWeekday, CafeDayHours>

/** Canonical weekday order for the schedule editor / display. */
export const WEEKDAYS: { key: CafeWeekday; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
]

const SAME_DAY: CafeDayHours = { closed: false, open: "07:30", close: "22:00" }

export const DEFAULT_CAFE_SCHEDULE: CafeSchedule = {
  mon: { ...SAME_DAY },
  tue: { ...SAME_DAY },
  wed: { ...SAME_DAY },
  thu: { ...SAME_DAY },
  fri: { ...SAME_DAY },
  sat: { ...SAME_DAY },
  sun: { ...SAME_DAY },
}

export interface CafeConfig {
  name: string
  /** WhatsApp number, normalised to international digits (e.g. "60123456789"). */
  phone: string
  location: string
  /** Short marketing line for the dashboard highlight. */
  tagline: string
  /** Master switch — off pauses ordering regardless of the schedule. */
  active: boolean
  menuImage: string | null
  /** Per-weekday opening hours. */
  schedule: CafeSchedule
  /** KL calendar dates (YYYY-MM-DD) the cafe is closed — holidays. */
  closedDates: string[]
}

export const DEFAULT_CAFE_CONFIG: CafeConfig = {
  name: "KIZ Cafe",
  phone: "",
  location: "KIZ Cafeteria",
  tagline: "Order from your phone, skip the queue — pick up when it's ready.",
  active: false,
  menuImage: null,
  schedule: DEFAULT_CAFE_SCHEDULE,
  closedDates: [],
}

export interface CafeItemView {
  id: string
  name: string
  price: number
  category: string
  description: string | null
  dietary: string[]
  imageUrl: string | null
  isAvailable: boolean
  published: boolean
  sortOrder: number
}

/** One line in the cart / a stored order snapshot. */
export interface CafeCartLine {
  itemId: string
  name: string
  price: number
  qty: number
}

export interface CafeOrderView {
  id: string
  refCode: string
  items: CafeCartLine[]
  subtotal: number
  pickupTime: string | null
  note: string | null
  /** Pre-formatted KL timestamp, e.g. "10 Sep, 1:24 PM". */
  when: string
  whatsappSentAt: string | null
}

/** Canonical category order for the menu chips. Admins can type a new one. */
export const CAFE_CATEGORIES = ["Set Meal", "Makanan", "Minuman", "Snek", "Dessert"] as const

export interface DietaryMeta {
  value: string
  label: string
  icon: string
}

export const DIETARY_TAGS: DietaryMeta[] = [
  { value: "halal", label: "Halal", icon: "verified" },
  { value: "vegetarian", label: "Vegetarian", icon: "eco" },
  { value: "spicy", label: "Spicy", icon: "local_fire_department" },
  { value: "contains_nuts", label: "Contains nuts", icon: "warning" },
]

export function dietaryMeta(value: string): DietaryMeta {
  return DIETARY_TAGS.find((t) => t.value === value) ?? { value, label: value, icon: "label" }
}

/** Format a ringgit amount, e.g. 6 → "RM6.00". */
export function formatRM(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `RM${safe.toFixed(2)}`
}

/** Normalise a Malaysian phone number to the digits `wa.me` expects. */
export function normalisePhone(raw: string): string {
  const digits = (raw ?? "").replace(/[^\d]/g, "")
  if (!digits) return ""
  if (digits.startsWith("60")) return digits
  if (digits.startsWith("0")) return `60${digits.slice(1)}`
  return digits
}

/** Build the WhatsApp click-to-chat deep link with the order pre-filled. */
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${normalisePhone(phone)}?text=${encodeURIComponent(message)}`
}

export interface OrderMessageInput {
  cafeName: string
  refCode: string
  customerName: string
  matricId: string
  lines: CafeCartLine[]
  subtotal: number
  pickupTime?: string | null
  note?: string | null
}

/** The itemised WhatsApp message the student sends to the cafe. */
export function buildOrderMessage(input: OrderMessageInput): string {
  const lines = input.lines
    .map((l, i) => `${i + 1}. ${l.name} ×${l.qty} — ${formatRM(l.price * l.qty)}`)
    .join("\n")

  const parts = [
    `*New Order — ${input.cafeName}*`,
    `Ref: *${input.refCode}*`,
    `Name: ${input.customerName} (${input.matricId})`,
  ]
  if (input.pickupTime) parts.push(`Pickup: ${input.pickupTime}`)
  parts.push("", lines, "", `*Subtotal: ${formatRM(input.subtotal)}*`)
  if (input.note) parts.push(`Note: ${input.note}`)
  parts.push("", "_Pay at pickup · sent from the KIZ app_")
  return parts.join("\n")
}

/** KL "HH:MM" (24h) right now. */
export function nowHhmmKl(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const hour = v.hour === "24" ? "00" : v.hour
  return `${hour}:${v.minute}`
}

const WEEKDAY_MAP: Record<string, CafeWeekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
}

/** Today's weekday key + KL calendar date (YYYY-MM-DD). */
export function klToday(now: Date = new Date()): { weekday: CafeWeekday; date: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return {
    weekday: WEEKDAY_MAP[v.weekday] ?? "mon",
    date: `${v.year}-${v.month}-${v.day}`,
  }
}

/** "14:30" → "2:30 PM". */
export function formatTime12(hhmm: string): string {
  const [hRaw, mRaw] = hhmm.split(":").map(Number)
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm
  const h = hRaw % 12 || 12
  const suffix = hRaw < 12 ? "AM" : "PM"
  return `${h}:${String(mRaw).padStart(2, "0")} ${suffix}`
}

/** Hours label for one day, e.g. "7:30 AM – 10:00 PM" or "Closed". */
export function dayHoursLabel(day: CafeDayHours): string {
  return day.closed ? "Closed" : `${formatTime12(day.open)} – ${formatTime12(day.close)}`
}

export interface CafeStatus {
  open: boolean
  /** Short status, e.g. "Open now" / "Closed today". */
  label: string
  /** Today's hours, e.g. "7:30 AM – 10:00 PM" or "Closed today". */
  todayHours: string
  /** True when today is a configured holiday (closed date). */
  holiday: boolean
}

/**
 * Resolve the cafe's live status. `active` is the master kill-switch; a closed
 * date (holiday) or a day marked closed wins over the hours; the open window
 * wraps past midnight when `close <= open`.
 */
export function cafeStatus(cfg: CafeConfig, now: Date = new Date()): CafeStatus {
  const { weekday, date } = klToday(now)
  const day = cfg.schedule[weekday] ?? DEFAULT_CAFE_SCHEDULE[weekday]
  const todayHours = day.closed ? "Closed today" : dayHoursLabel(day)

  if (!cfg.active) return { open: false, label: "Not accepting orders", todayHours, holiday: false }
  if (cfg.closedDates.includes(date)) return { open: false, label: "Closed today", todayHours, holiday: true }
  if (day.closed) return { open: false, label: "Closed today", todayHours, holiday: false }

  const t = nowHhmmKl(now)
  const openNow = day.close <= day.open ? t >= day.open || t < day.close : t >= day.open && t < day.close
  return { open: openNow, label: openNow ? "Open now" : "Closed", todayHours, holiday: false }
}

/** Is the cafe accepting orders right now? */
export function isCafeOpen(cfg: CafeConfig, now: Date = new Date()): boolean {
  return cafeStatus(cfg, now).open
}

/** Suggested pickup times (every 15 min across the next 3 hours), KL clock. */
export function pickupTimeOptions(now: Date = new Date()): string[] {
  const out: string[] = []
  const base = nowHhmmKl(now)
  const [h, m] = base.split(":").map(Number)
  let total = h * 60 + Math.ceil(m / 15) * 15
  for (let i = 0; i < 12; i++) {
    const hh = Math.floor((total % (24 * 60)) / 60)
    const mm = total % 60
    const suffix = hh < 12 ? "AM" : "PM"
    const h12 = hh % 12 || 12
    out.push(`${h12}:${String(mm).padStart(2, "0")} ${suffix}`)
    total += 15
  }
  return out
}

/** Recompute a cart subtotal from its lines. */
export function cartSubtotal(lines: CafeCartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.qty, 0)
}

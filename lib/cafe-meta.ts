/**
 * KIZ Cafe smart-ordering meta. Pure helpers + types shared by the member
 * ordering UI, the admin menu manager and the WhatsApp hand-off. No server
 * imports here so client components can use it freely.
 */

export interface CafeConfig {
  name: string
  /** WhatsApp number, normalised to international digits (e.g. "60123456789"). */
  phone: string
  location: string
  /** Human label, e.g. "7:30 AM – 10:00 PM". */
  hoursLabel: string
  /** Structured opening time, 24h KL "HH:MM" — drives the Open/Closed badge. */
  opensAt: string
  /** Structured closing time, 24h KL "HH:MM". */
  closesAt: string
  /** Short marketing line for the dashboard highlight. */
  tagline: string
  active: boolean
  menuImage: string | null
}

export const DEFAULT_CAFE_CONFIG: CafeConfig = {
  name: "KIZ Cafe",
  phone: "",
  location: "KIZ Cafeteria",
  hoursLabel: "Daily · 7:30 AM – 10:00 PM",
  opensAt: "07:30",
  closesAt: "22:00",
  tagline: "Order from your phone, skip the queue — pick up when it's ready.",
  active: false,
  menuImage: null,
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

/**
 * Is the cafe accepting orders right now? `active` is the admin kill-switch;
 * otherwise the KL clock must sit inside the open/close window. Same-day ranges
 * only (a cafe open past midnight would need a cross-midnight flag).
 */
export function isCafeOpen(
  cfg: Pick<CafeConfig, "active" | "opensAt" | "closesAt">,
  now: Date = new Date(),
): boolean {
  if (!cfg.active) return false
  const t = nowHhmmKl(now)
  return t >= cfg.opensAt && t < cfg.closesAt
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

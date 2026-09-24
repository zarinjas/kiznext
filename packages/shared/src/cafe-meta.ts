/**
 * KIZ Cafe smart-ordering meta — pure, platform-free helpers shared by the web
 * app and the mobile app. No Prisma / Next.js / React imports.
 *
 * The web app keeps its own copy at `lib/cafe-meta.ts` (same precedent as
 * `ar-translate-meta` / `direktori-meta`); this file is the mobile source.
 */

export interface CafeConfig {
  name: string
  /** WhatsApp number, normalised to international digits (e.g. "60123456789"). */
  phone: string
  location: string
  hoursLabel: string
  opensAt: string
  closesAt: string
  tagline: string
  active: boolean
  menuImage: string | null
}

export interface CafeItem {
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

export interface CafeCartLine {
  itemId: string
  name: string
  price: number
  qty: number
}

export interface CafeOrder {
  id: string
  refCode: string
  items: CafeCartLine[]
  subtotal: number
  pickupTime: string | null
  note: string | null
  when: string
  whatsappSentAt: string | null
}

export interface CafeData {
  config: CafeConfig
  menu: CafeItem[]
  orders: CafeOrder[]
}

/** Dietary tag key → human label (mirrors `lib/cafe-meta.ts` on the web). */
export const CAFE_DIETARY_LABELS: Record<string, string> = {
  halal: "Halal",
  vegetarian: "Vegetarian",
  spicy: "Spicy",
  contains_nuts: "Contains nuts",
}

/** Format a ringgit amount, e.g. 6 → "RM6.00". */
export function formatRM(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `RM${safe.toFixed(2)}`
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

/** Is the cafe accepting orders right now? Same-day window only. */
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
  const [h, m] = nowHhmmKl(now).split(":").map(Number)
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

export const TIMEZONE = "Asia/Kuala_Lumpur"

export function nowMalaysia(): Date {
  return new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format()
  )
}

export function formatMalaysia(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

/** Date only, in Malaysia time — e.g. "15 Mar 2027". */
export function formatMalaysiaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
  }).format(date)
}

/** Add a number of calendar months to a date (Malaysia calendar-safe enough). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())))
  return d
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

// ── Wall-clock helpers (Malaysia) ────────────────────────────────────────────
//
// Date *inputs* are a different problem from date *display*. A picker deals in
// a "wall clock" value — the calendar day a human sees — which must be resolved
// in Asia/Kuala_Lumpur, not on the device clock. A resident whose phone is still
// on a home timezone was otherwise able to book the wrong slot, or be blocked
// from picking today.
//
// The representation is a plain `YYYY-MM-DD` / `HH:MM` string plus a `Date`
// anchored at **noon local** for picker interop. Noon is deliberate: it is far
// enough from both midnight boundaries that no timezone or DST offset can shift
// the calendar day.

/** Today's calendar date in Malaysia, as `YYYY-MM-DD`. */
export function todayIsoMalaysia(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/** Current wall-clock time in Malaysia, as 24h `HH:MM`. */
export function nowHhmmMalaysia(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date())
}

/**
 * Turn a `YYYY-MM-DD` wall-clock date into a `Date` anchored at local noon,
 * safe to hand to a native date picker or use as a min/max bound.
 */
export function wallClockDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Serialize a picker `Date` back to a `YYYY-MM-DD` wall-clock string. */
export function wallClockIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Turn `HH:MM` into a `Date` on an arbitrary day, for a native time picker. */
export function wallClockTime(hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  const d = new Date(2000, 0, 1, h, min, 0, 0)
  return d
}

/** Serialize a picker `Date` back to a 24h `HH:MM` string. */
export function wallClockHhmm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Today's date in Malaysia as a noon-anchored `Date` — for `minimumDate`. */
export function todayMalaysiaDate(): Date {
  return wallClockDate(todayIsoMalaysia()) ?? new Date()
}

/** Human label for a `YYYY-MM-DD` wall-clock date — "15 Mar 2027". */
export function formatWallClockDate(iso: string): string {
  const d = wallClockDate(iso)
  if (!d) return ""
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

/** Human label for an `HH:MM` wall-clock time — "6:30 pm". */
export function formatWallClockTime(hhmm: string): string {
  const d = wallClockTime(hhmm)
  if (!d) return ""
  return new Intl.DateTimeFormat("en-MY", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}

/** Inclusive day difference between two `YYYY-MM-DD` wall-clock dates. */
export function wallClockNights(startIso: string, endIso: string): number | null {
  const a = wallClockDate(startIso)
  const b = wallClockDate(endIso)
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

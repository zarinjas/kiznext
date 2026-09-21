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

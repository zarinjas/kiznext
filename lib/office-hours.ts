export const TIMEZONE = "Asia/Kuala_Lumpur"
export const OFFICE_START = 8 // 8am
export const OFFICE_END = 17 // 5pm

export function isOfficeHours(now: Date = new Date()): boolean {
  const msia = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now)

  const weekday = msia.find((p) => p.type === "weekday")?.value
  const hour = parseInt(msia.find((p) => p.type === "hour")?.value ?? "0", 10)

  if (!weekday) return false
  if (weekday === "Sat" || weekday === "Sun") return false

  return hour >= OFFICE_START && hour < OFFICE_END
}

export function getOfficeHoursMessage(): string {
  return "Thank you for contacting KIZ management. Our office hours are Monday–Friday, 8:00 AM – 5:00 PM. Outside these hours, your message will be answered as soon as the office opens."
}

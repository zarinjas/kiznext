export const TIMEZONE = "Asia/Kuala_Lumpur";

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
  );
}

export function formatMalaysia(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Absolute public origin for Open Graph / Twitter card URLs and the check-in
 * QR links, so shared links and printed QRs resolve to a reachable host.
 *
 * Prefer NEXT_PUBLIC_SITE_URL (set for the deployed host), falling back to
 * AUTH_URL then localhost. Empty / whitespace values are ignored — an empty
 * `NEXT_PUBLIC_SITE_URL=""` in `.env` must NOT win over AUTH_URL, or the QR
 * would encode a relative path.
 */
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return undefined
}

export function siteUrl(raw: string = ""): string {
  const origin = (
    firstNonEmpty(process.env.NEXT_PUBLIC_SITE_URL, process.env.AUTH_URL) ??
    "http://localhost:3000"
  ).replace(/\/+$/, "")
  if (!raw) return origin
  if (/^https?:\/\//.test(raw)) return raw
  return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`
}

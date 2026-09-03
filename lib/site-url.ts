/**
 * Absolute public origin for Open Graph / Twitter card URLs so shared links
 * resolve to reachable image + canonical URLs. Prefer NEXT_PUBLIC_SITE_URL
 * (set for the deployed host), falling back to AUTH_URL then localhost so
 * local previews and the existing auth/email origin stay in sync.
 */
export function siteUrl(raw: string = ""): string {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  )
  if (!raw) return origin
  if (/^https?:\/\//.test(raw)) return raw
  return `${origin}${raw.startsWith("/") ? "" : "/"}${raw}`
}

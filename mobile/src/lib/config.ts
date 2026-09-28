/**
 * Runtime config for the mobile app.
 *
 * Point the app at a different backend without rebuilding by setting
 * `EXPO_PUBLIC_API_URL` (e.g. in `mobile/.env` for local dev):
 *
 *   EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://mykiz.my").replace(
  /\/+$/,
  ""
)

export const API_PREFIX = `${API_BASE_URL}/api/v1`

/** Turn a stored upload path (`/uploads/x.png`) into an absolute URL. */
export function absoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

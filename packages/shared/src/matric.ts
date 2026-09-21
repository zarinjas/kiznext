/**
 * Matric normaliser — the single source of truth for matric identity.
 *
 * The eKolej export appends footnote markers to some international-student
 * matrics (`A222765*`), so a typed clean `A222765` would never match. Uppercase
 * + strip everything non-alphanumeric makes all forms resolve.
 */
export function cleanMatric(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase()
}

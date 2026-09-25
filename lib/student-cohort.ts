/**
 * Student cohort classification (Junior / Senior / Postgrad).
 *
 * The eKolej sheet has no reliable year-of-study column, but a UKM matric ID
 * carries the intake in its first two digits after the faculty letter —
 * `A22xxxxx` is this year's intake (2026), `A21xxxxx` last year's (2025), and
 * so on. The "current" intake prefix is therefore the newest prefix present
 * among the active intake's students (this year's freshmen); everyone older is
 * a senior. `P`-prefixed matrics are postgraduates.
 *
 * Pure functions only — no Prisma — so this can run in server and client code.
 */

export type Cohort = "junior" | "senior" | "postgrad"

export interface MatricPrefix {
  /** Faculty / programme letter, uppercased (e.g. "A", "P"). */
  letter: string
  /** Two-digit intake sequence from the matric (e.g. 22). */
  year: number
}

/** Parse the faculty letter + two-digit intake prefix from a matric ID. */
export function matricPrefix(matricId: string | null | undefined): MatricPrefix | null {
  const m = /^([A-Za-z])(\d{2})/.exec((matricId ?? "").trim())
  if (!m) return null
  return { letter: m[1].toUpperCase(), year: Number(m[2]) }
}

/**
 * The current intake prefix = the most common non-postgrad prefix among the
 * given matrics. This year's freshmen normally dominate the active intake, and
 * using the mode makes the result robust to a stray odd matric (e.g. "A99…").
 * Ties go to the higher (newer) year. Returns null when nothing parses.
 */
export function resolveCurrentPrefix(matrics: (string | null | undefined)[]): number | null {
  const counts = new Map<number, number>()
  for (const matric of matrics) {
    const p = matricPrefix(matric)
    if (!p || p.letter === "P") continue
    counts.set(p.year, (counts.get(p.year) ?? 0) + 1)
  }
  let best: number | null = null
  let bestCount = -1
  for (const [year, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && year > best)) {
      best = year
      bestCount = count
    }
  }
  return best
}

/** First number in a free-text year-of-study cell ("Tahun 2" → 2). */
export function yearOfStudyNumber(raw: string | null | undefined): number | null {
  const m = /(\d+)/.exec((raw ?? "").trim())
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= 15 ? n : null
}

/**
 * Classify a student. The matric prefix is the primary signal (the sheet has no
 * year column); `yearOfStudy` is only used when the matric can't be parsed.
 */
export function classifyCohort(
  matricId: string | null | undefined,
  currentPrefix: number | null,
  yearOfStudy?: string | null,
): Cohort | null {
  const p = matricPrefix(matricId)
  if (p?.letter === "P") return "postgrad"

  if (p && currentPrefix !== null) {
    if (p.year === currentPrefix) return "junior"
    if (p.year < currentPrefix) return "senior"
    return null // newer than the current intake — implausible
  }

  const year = yearOfStudyNumber(yearOfStudy)
  if (year === 1) return "junior"
  if (year !== null && year >= 2) return "senior"
  return null
}

export const COHORT_LABELS: Record<Cohort, string> = {
  junior: "Junior",
  senior: "Senior",
  postgrad: "Postgrad",
}

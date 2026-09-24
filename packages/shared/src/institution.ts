/**
 * Institution identity — the single source of truth for how KIZ names itself.
 *
 * These strings were previously hardcoded per-screen, which let one surface
 * drift to a different college's name entirely. Import from here instead of
 * typing the name, so a rename is one edit and a typo is impossible.
 */

/** Short product name. */
export const APP_NAME = "MyKIZ"

/** Residential college name, as printed on official documents. */
export const COLLEGE_NAME = "Kolej Ibu Zain"

/** Parent university. */
export const UNIVERSITY_NAME = "Universiti Kebangsaan Malaysia"

/** Abbreviations. */
export const COLLEGE_SHORT = "KIZ"
export const UNIVERSITY_SHORT = "UKM"

/** `Kolej Ibu Zain · Universiti Kebangsaan Malaysia` — login/auth subtitle. */
export const COLLEGE_WITH_UNIVERSITY = `${COLLEGE_NAME} · ${UNIVERSITY_NAME}`

/**
 * One-line value proposition. Stated in AI/AR terms on purpose: it is the first
 * sentence a new resident — or a competition judge — reads, so it should name
 * the category the product competes in.
 */
export const APP_TAGLINE = "AI & AR campus companion for Kolej Ibu Zain"

/**
 * Where a resident physically goes after signing in/out at the counter.
 * Referenced by both the QR flow and the in-app check-in flow.
 */
export const CHECKIN_NEXT_COUNTER = "Counter 2 (UKM Real Estate)"

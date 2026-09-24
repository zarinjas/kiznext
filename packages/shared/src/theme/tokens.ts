/**
 * KIZ Design Language — raw tokens.
 * Single source of truth, shared by web (`lib/theme/tokens.ts` mirrors this)
 * and mobile. Never import a UI framework here.
 *
 * Direction: clean, minimalist, modern SaaS (Linear / Vercel / Stripe school).
 * Pure white surfaces, neutral mono ink, soft gradients as the only decoration.
 */

/** Neutral ink ramp — doubles as the primary (near-black) action colour. */
const neutral = {
  50: "#FAFAFA",
  100: "#F4F4F5",
  200: "#E9E9EC",
  300: "#D4D4D8",
  400: "#A1A1AA",
  500: "#71717A",
  600: "#52525B",
  700: "#3F3F46",
  800: "#27272A",
  900: "#18181B",
  950: "#09090B",
} as const

export const color = {
  /**
   * Primary scale — KIZ teal. Fresh, energetic, distinct from the semantic
   * blue/green/amber/red below. 600 is the primary action colour, 50/100 are
   * the soft tint backgrounds used for chips, icon tiles and hover states.
   */
  brand: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4",
    600: "#0891B2", // primary action
    700: "#0E7490",
    800: "#155E75",
    900: "#164E63", // deepest ink
  },
  /** Soft accent — used only for gentle gradients, overlines, focus haze. */
  accent: {
    50: "#F6F5FF",
    100: "#EDEBFE",
    200: "#DEDAFD",
    300: "#C6BFFA",
    400: "#A99EF5",
    500: "#8B7CEE",
    600: "#6F5BE0",
    700: "#5B47C4",
    900: "#332976",
  },
  ink: {
    900: neutral[950],
    700: neutral[700],
    500: neutral[500],
    300: neutral[400],
  },
  /** Pure white product surfaces. */
  canvas: "#FFFFFF",
  canvasSunk: "#FAFAFA",
  surface: "#FFFFFF",
  surfaceMuted: "#FAFAFA",
  border: "#ECECEF",
  borderStrong: "#DFDFE3",
  success: { main: "#16A34A", soft: "#F0FDF4", ink: "#15803D" },
  warning: { main: "#D97706", soft: "#FFFBEB", ink: "#B45309" },
  danger: { main: "#DC2626", soft: "#FEF2F2", ink: "#B91C1C" },
  info: { main: "#2563EB", soft: "#EFF6FF", ink: "#1D4ED8" },
  neutral: { main: neutral[500], soft: neutral[100], ink: neutral[700] },
} as const

/**
 * Module accent tints.
 *
 * Each app module (laundry, SOS, facilities, …) needs a soft background plus a
 * readable ink for its icon tile. These were previously hardcoded per-screen in
 * the mobile dashboard, so the "one source of truth" rule quietly did not hold
 * for the most-seen screen in the product. Kept deliberately narrow: a tint is
 * decoration for an icon tile, never a surface or a text colour.
 */
export const moduleTint = {
  laundry: { bg: "#E8F8F4", ink: "#178D77" },
  checkin: { bg: "#EAF0FF", ink: "#4F6FD8" },
  room: { bg: "#FFF2E5", ink: "#D9781D" },
  facilities: { bg: "#E8F8FA", ink: "#008FA8" },
  guide: { bg: "#FCECF4", ink: "#C34C83" },
  helpdesk: { bg: "#EEF2FF", ink: "#5B5BD6" },
  lost: { bg: "#F3F0FF", ink: "#7758D6" },
  sos: { bg: "#FFECEC", ink: "#E44747" },
  guest: { bg: "#EFFAF3", ink: "#1E8E5A" },
  ai: { bg: "#ECFEFF", ink: "#0E7490" },
} as const

export type ModuleTintKey = keyof typeof moduleTint

/**
 * Gradient stop sets. The web renders these as CSS `linear-gradient`, mobile as
 * an SVG `LinearGradient` — same stops, so the two platforms cannot drift.
 */
export const gradientStops = {
  hero: ["#0E5E8A", "#0891B2", "#39C2DA"],
  lens: ["#4C3FAF", "#6F5BE0", "#A99EF5"],
  wayfinder: ["#0E5E8A", "#0891B2", "#22D3EE"],
  login: ["#F6F5FF", "#EFF6FF", "#FFFFFF"],
} as const

/** Elevation used by the mobile dashboard cards. */
export const elevation = {
  card: {
    shadowColor: "#0F263F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
} as const

export const radius = {
  input: 10,
  button: 10,
  card: 14,
  cardLg: 18,
  sheet: 20,
  pill: 999,
} as const

export const layout = {
  navRailWidth: 256,
  navRailCollapsed: 72,
  topBarHeight: 60,
  bottomNavHeight: 64,
  contentMaxWidth: 1200,
} as const

export type ColorTokens = typeof color

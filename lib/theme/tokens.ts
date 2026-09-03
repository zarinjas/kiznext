/**
 * KIZ Design Language — raw tokens.
 * Single source of truth. Consumed by theme.ts; never import MUI here.
 *
 * Direction: clean, minimalist, modern SaaS (Linear / Vercel / Stripe school).
 * Pure white surfaces, neutral mono ink, soft gradients as the only decoration.
 *
 * NOTE: the `brand` scale is intentionally NEUTRAL for now — the final primary
 * colour is still to be decided. Swapping it here re-skins the entire app,
 * because every component reads from this scale.
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

export const font = {
  /**
   * `display` is kept as a key so call sites don't break, but it now points at
   * the same clean sans as the rest of the UI. No serif anywhere.
   */
  display: 'var(--font-sans), "Inter", -apple-system, "Segoe UI", sans-serif',
  heading: 'var(--font-sans), "Inter", -apple-system, "Segoe UI", sans-serif',
  body: 'var(--font-sans), "Inter", -apple-system, "Segoe UI", sans-serif',
  mono: 'var(--font-mono), "Geist Mono", ui-monospace, SFMono-Regular, monospace',
} as const

export const radius = {
  input: 10,
  button: 10,
  card: 14,
  cardLg: 18,
  sheet: 20,
  pill: 999,
} as const

/** Very subtle, neutral elevations. Structure comes from hairlines, not shadow. */
export const elevation = {
  e0: "none",
  e1: "0 1px 2px rgba(9,9,11,0.04)",
  e2: "0 1px 3px rgba(9,9,11,0.05), 0 4px 12px rgba(9,9,11,0.04)",
  e3: "0 2px 8px rgba(9,9,11,0.05), 0 12px 32px rgba(9,9,11,0.08)",
  e4: "0 4px 12px rgba(9,9,11,0.06), 0 24px 56px rgba(9,9,11,0.12)",
  /** Kept as keys for existing call sites. */
  brand: "0 1px 2px rgba(9,9,11,0.16), 0 6px 20px rgba(9,9,11,0.14)",
  accent: "0 6px 20px rgba(139,124,238,0.22)",
  /** Focus ring. */
  ring: "0 0 0 3px rgba(9,9,11,0.08)",
} as const

/**
 * Soft gradients — the only decoration in the system. Keep them whisper-quiet.
 */
export const gradient = {
  /** Page/hero haze: lavender → sky → white. */
  hero: "linear-gradient(135deg, #F7F5FF 0%, #F1F4FF 30%, #F0F9FF 62%, #FFFFFF 100%)",
  /** Sidebar rail: near-white with the faintest cool drift. */
  rail: "linear-gradient(180deg, #FDFDFE 0%, #FAFAFB 45%, #F7F7F9 100%)",
  /** Ambient mesh for large empty areas. */
  mesh: `
    radial-gradient(680px 420px at 8% 0%, rgba(139,124,238,0.10), transparent 60%),
    radial-gradient(760px 460px at 98% 4%, rgba(56,132,255,0.09), transparent 62%)
  `,
  /** Feature/marketing surface (login panel). */
  panel: "linear-gradient(150deg, #FAF9FF 0%, #F2F5FF 40%, #EFF8FF 72%, #FFFFFF 100%)",
} as const

/**
 * Frosted surfaces — top bar, palette, sheets.
 * `background` uses the MUI CSS variable so it follows light/dark automatically.
 */
export const glass = {
  background:
    "color-mix(in srgb, var(--mui-palette-background-default) 80%, transparent)",
  backdropFilter: "blur(16px) saturate(1.5)",
  border: "1px solid rgba(9,9,11,0.06)",
} as const

export const motion = {
  fast: "140ms",
  base: "200ms",
  slow: "300ms",
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
} as const

export const layout = {
  navRailWidth: 256,
  navRailCollapsed: 72,
  topBarHeight: 60,
  bottomNavHeight: 64,
  contentMaxWidth: 1200,
} as const

/**
 * KIZ Design Language — raw tokens.
 * Single source of truth. Consumed by theme.ts; never import MUI here.
 */

export const color = {
  brand: {
    50: "#F3F9EC",
    100: "#E4F1D3",
    200: "#C9E4A9",
    300: "#ABD679",
    400: "#91C953", // KIZ primary (accent, fills on dark)
    500: "#78B33E",
    600: "#5F9430", // min contrast shade for text/actions on white
    700: "#4A7426",
    800: "#2E4A18",
    900: "#004B23", // KIZ deep green
  },
  ink: {
    900: "#101814",
    700: "#2E3B33",
    500: "#5C6B62",
    300: "#93A199",
  },
  canvas: "#F6F8F5",
  surface: "#FFFFFF",
  border: "#E5EAE4",
  borderStrong: "#D6DFD5",
  success: { main: "#5F9430", soft: "#EDF5E4", ink: "#3E6420" },
  warning: { main: "#B7791F", soft: "#FDF3E3", ink: "#8A5A14" },
  danger: { main: "#C0392B", soft: "#FBEAE8", ink: "#932B20" },
  info: { main: "#33658A", soft: "#EDF3F8", ink: "#24496A" },
  neutral: { main: "#5C6B62", soft: "#EFF2EF", ink: "#414C46" },
} as const

export const font = {
  heading: 'var(--font-fraunces), "Fraunces", Georgia, serif',
  body: 'var(--font-dm-sans), "DM Sans", -apple-system, "Segoe UI", sans-serif',
} as const

export const radius = {
  input: 10,
  button: 10,
  card: 16,
  sheet: 20,
} as const

/** Cool-tinted, layered elevations. Cards default to e1 + hairline. */
export const elevation = {
  e0: "none",
  e1: "0 1px 2px rgba(16,24,20,0.05)",
  e2: "0 1px 2px rgba(16,24,20,0.04), 0 6px 16px rgba(16,24,20,0.06)",
  e3: "0 2px 6px rgba(16,24,20,0.05), 0 16px 40px rgba(16,24,20,0.10)",
  e4: "0 4px 12px rgba(16,24,20,0.07), 0 24px 56px rgba(16,24,20,0.14)",
} as const

/** Subtle glass — top bar, command palette, floating sheets only. */
export const glass = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(12px) saturate(1.4)",
  border: "1px solid rgba(255,255,255,0.6)",
} as const

export const motion = {
  fast: "150ms",
  base: "200ms",
  slow: "300ms",
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const

export const layout = {
  navRailWidth: 264,
  navRailCollapsed: 72,
  topBarHeight: 64,
  bottomNavHeight: 64,
  contentMaxWidth: 1200,
} as const

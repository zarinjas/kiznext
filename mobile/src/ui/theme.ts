import { createBox, createText, createTheme } from "@shopify/restyle"
import { color, radius } from "@kiz/shared"

/**
 * Mobile theme — the RN twin of the web MUI theme. Every value comes from the
 * shared design tokens in `packages/shared/src/theme/tokens.ts`, so a token
 * change re-skins both apps.
 */
const colors = {
  canvas: color.canvas,
  canvasSunk: color.canvasSunk,
  surface: color.surface,
  surfaceMuted: color.surfaceMuted,
  border: color.border,
  borderStrong: color.borderStrong,

  ink900: color.ink[900],
  ink700: color.ink[700],
  ink500: color.ink[500],
  ink300: color.ink[300],

  brand50: color.brand[50],
  brand100: color.brand[100],
  brand300: color.brand[300],
  brand500: color.brand[500],
  brand600: color.brand[600],
  brand700: color.brand[700],
  brand900: color.brand[900],

  accent50: color.accent[50],
  accent100: color.accent[100],
  accent600: color.accent[600],

  success: color.success.main,
  successSoft: color.success.soft,
  successInk: color.success.ink,
  warning: color.warning.main,
  warningSoft: color.warning.soft,
  warningInk: color.warning.ink,
  danger: color.danger.main,
  dangerSoft: color.danger.soft,
  dangerInk: color.danger.ink,
  info: color.info.main,
  infoSoft: color.info.soft,
  infoInk: color.info.ink,
  neutral: color.neutral.main,
  neutralSoft: color.neutral.soft,
  neutralInk: color.neutral.ink,

  white: "#FFFFFF",
  transparent: "transparent",
} as const

const spacing = {
  none: 0,
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

const borderRadii = {
  none: 0,
  input: radius.input,
  button: radius.button,
  card: radius.card,
  cardLg: radius.cardLg,
  sheet: radius.sheet,
  pill: radius.pill,
} as const

const breakpoints = {
  phone: 0,
  tablet: 768,
} as const

const textVariants = {
  defaults: {
    fontSize: 15,
    lineHeight: 22,
    color: "ink900",
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: "ink900",
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: "ink900",
  },
  subheading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: "ink900",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "ink700",
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: "ink900",
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: "ink500",
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: "ink500",
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1,
    color: "ink500",
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
} as const

export const theme = createTheme({
  colors,
  spacing,
  borderRadii,
  breakpoints,
  textVariants,
})

export type Theme = typeof theme

export const Box = createBox<Theme>()
export const Text = createText<Theme>()

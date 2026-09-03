"use client"

import { createTheme } from "@mui/material/styles"
import type { Shadows } from "@mui/material/styles"
import { color, font, radius, elevation } from "./tokens"

/**
 * KIZ theme — MUI v7 as foundation, fully re-tokened.
 * Clean, minimalist, modern SaaS: white surfaces, neutral ink, hairline
 * structure, tight sans-serif type. Dual light/dark via CSS variables.
 */

const shadows = Array(25).fill(elevation.e1) as unknown as Shadows
shadows[0] = elevation.e0
shadows[1] = elevation.e1
shadows[2] = elevation.e2
shadows[8] = elevation.e3
shadows[16] = elevation.e3
shadows[24] = elevation.e4

const shared = {
  typography: {
    fontFamily: font.body,
    // Tight, confident sans scale. Negative tracking on large sizes = modern SaaS.
    h1: { fontFamily: font.heading, fontWeight: 640, fontSize: "1.75rem", lineHeight: 1.15, letterSpacing: "-0.032em" },
    h2: { fontFamily: font.heading, fontWeight: 640, fontSize: "1.375rem", lineHeight: 1.22, letterSpacing: "-0.026em" },
    h3: { fontFamily: font.heading, fontWeight: 620, fontSize: "1.0625rem", lineHeight: 1.4, letterSpacing: "-0.018em" },
    h4: { fontFamily: font.heading, fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.45, letterSpacing: "-0.012em" },
    h5: { fontFamily: font.heading, fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.5, letterSpacing: "-0.01em" },
    h6: { fontFamily: font.heading, fontWeight: 600, fontSize: "0.8125rem", lineHeight: 1.5, letterSpacing: "-0.008em" },
    body1: { fontSize: "0.875rem", lineHeight: 1.6, letterSpacing: "-0.009em" },
    body2: { fontSize: "0.8125rem", lineHeight: 1.55, letterSpacing: "-0.008em" },
    caption: { fontSize: "0.75rem", lineHeight: 1.45, fontWeight: 500, letterSpacing: "-0.005em" },
    overline: { fontSize: "0.6875rem", lineHeight: 1.4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const },
    button: { textTransform: "none" as const, fontWeight: 550, fontSize: "0.875rem", letterSpacing: "-0.01em" },
    fontFamilyMonospace: font.mono,
  },
  shape: { borderRadius: radius.button },
}

export const theme = createTheme({
  ...shared,
  shadows,
  cssVariables: { colorSchemeSelector: "data" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: color.brand[600], light: color.brand[100], dark: color.brand[900], contrastText: "#FFFFFF" },
        secondary: { main: color.accent[600], light: color.accent[100], dark: color.accent[700], contrastText: "#FFFFFF" },
        success: { main: color.success.main, light: color.success.soft, dark: color.success.ink },
        warning: { main: color.warning.main, light: color.warning.soft, dark: color.warning.ink },
        error: { main: color.danger.main, light: color.danger.soft, dark: color.danger.ink },
        info: { main: color.info.main, light: color.info.soft, dark: color.info.ink },
        background: { default: "#FFFFFF", paper: "#FFFFFF" },
        text: { primary: color.ink[900], secondary: color.ink[500], disabled: color.ink[300] },
        divider: color.border,
        action: { hover: "rgba(9,9,11,0.035)", selected: color.brand[50] },
      },
    },
    dark: {
      palette: {
        primary: { main: "#FAFAFA", light: "#27272A", dark: "#FFFFFF", contrastText: "#09090B" },
        secondary: { main: color.accent[400], light: "#241F45", dark: color.accent[300], contrastText: "#0B0A14" },
        success: { main: "#4ADE80", light: "#0C1F14", dark: "#86EFAC" },
        warning: { main: "#FBBF24", light: "#231A08", dark: "#FCD34D" },
        error: { main: "#F87171", light: "#250F0F", dark: "#FCA5A5" },
        info: { main: "#60A5FA", light: "#0C1A2E", dark: "#93C5FD" },
        background: { default: "#09090B", paper: "#101012" },
        text: { primary: "#FAFAFA", secondary: "#A1A1AA", disabled: "#52525B" },
        divider: "#1F1F23",
        action: { hover: "rgba(255,255,255,0.05)", selected: "rgba(255,255,255,0.08)" },
      },
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "::selection": { background: "rgba(139,124,238,0.22)" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.button,
          paddingInline: 14,
          minHeight: 36,
          transition: "background-color 140ms, border-color 140ms, color 140ms, box-shadow 140ms, opacity 140ms",
        },
        contained: ({ ownerState }) => ({
          boxShadow: "none",
          ...(ownerState.color === "primary" && {
            "&:hover": { boxShadow: "none", opacity: 0.88 },
          }),
        }),
        outlined: ({ theme: t }) => ({
          borderColor: t.palette.divider,
          color: t.palette.text.primary,
          backgroundColor: t.palette.background.paper,
          "&:hover": { borderColor: color.borderStrong, backgroundColor: t.palette.action.hover },
        }),
        text: ({ theme: t }) => ({
          color: t.palette.text.secondary,
          "&:hover": { color: t.palette.text.primary, backgroundColor: t.palette.action.hover },
        }),
        sizeSmall: { minHeight: 30, paddingInline: 11, fontSize: "0.8125rem" },
        sizeLarge: { minHeight: 42, paddingInline: 18, fontSize: "0.875rem" },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.button,
          color: t.palette.text.secondary,
          "&:hover": { color: t.palette.text.primary, backgroundColor: t.palette.action.hover },
        }),
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.card,
          border: `1px solid ${t.palette.divider}`,
          backgroundImage: "none",
          boxShadow: "none",
          transition: "box-shadow 180ms ease, border-color 180ms ease",
        }),
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.card }, root: { backgroundImage: "none" } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.input,
          backgroundColor: t.palette.background.paper,
          fontSize: "0.875rem",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: t.palette.divider },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: color.borderStrong },
          "&.Mui-focused": { boxShadow: elevation.ring },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: t.palette.text.primary, borderWidth: 1 },
        }),
      },
    },
    MuiTextField: {
      defaultProps: {
        // Always shrink the label to the notch — prevents it from ever
        // sitting on top of a `placeholder`, since many forms use both.
        slotProps: { inputLabel: { shrink: true } },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: "0.875rem" } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.pill, fontWeight: 550, fontSize: "0.75rem" },
        sizeSmall: { minHeight: 24 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: radius.sheet,
          border: `1px solid ${t.palette.divider}`,
          boxShadow: elevation.e4,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: ({ theme: t }) => ({ borderColor: t.palette.divider, backgroundImage: "none" }) },
    },
    MuiTooltip: {
      defaultProps: { arrow: false },
      styleOverrides: {
        tooltip: {
          fontSize: "0.75rem",
          fontWeight: 500,
          borderRadius: 7,
          padding: "5px 9px",
          backgroundColor: color.brand[900],
        },
      },
    },
    MuiDivider: { styleOverrides: { root: ({ theme: t }) => ({ borderColor: t.palette.divider }) } },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme: t }) => ({
          fontSize: "0.75rem",
          fontWeight: 550,
          letterSpacing: "-0.005em",
          textTransform: "none",
          color: t.palette.text.secondary,
          borderBottom: `1px solid ${t.palette.divider}`,
        }),
        root: ({ theme: t }) => ({ borderBottom: `1px solid ${t.palette.divider}` }),
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: radius.input } } },
    MuiSkeleton: { defaultProps: { animation: "wave" } },
  },
})

export default theme

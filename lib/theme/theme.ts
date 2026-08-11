"use client"

import { createTheme } from "@mui/material/styles"
import type { Shadows } from "@mui/material/styles"
import { color, font, radius, elevation } from "./tokens"

/**
 * KIZ theme — MUI v7 as foundation, fully re-tokened.
 * Dual light/dark schemes via CSS variables; dark mode is a token swap.
 */

const shadows = Array(25).fill(elevation.e1) as unknown as Shadows
shadows[0] = elevation.e0
shadows[8] = elevation.e3
shadows[16] = elevation.e3
shadows[24] = elevation.e4

const shared = {
  typography: {
    fontFamily: font.body,
    h1: { fontFamily: font.heading, fontWeight: 560, fontSize: "1.625rem", lineHeight: 1.3, letterSpacing: "-0.01em" },
    h2: { fontFamily: font.heading, fontWeight: 560, fontSize: "1.375rem", lineHeight: 1.35 },
    h3: { fontFamily: font.heading, fontWeight: 560, fontSize: "1.125rem", lineHeight: 1.4 },
    h4: { fontFamily: font.body, fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.45 },
    h5: { fontFamily: font.body, fontWeight: 600, fontSize: "0.875rem", lineHeight: 1.5 },
    h6: { fontFamily: font.body, fontWeight: 600, fontSize: "0.8125rem", lineHeight: 1.5 },
    body1: { fontSize: "0.875rem", lineHeight: 1.55 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.55 },
    caption: { fontSize: "0.75rem", lineHeight: 1.4, fontWeight: 500 },
    overline: { fontSize: "0.6875rem", lineHeight: 1.4, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const },
    button: { textTransform: "none" as const, fontWeight: 600, fontSize: "0.875rem" },
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
        primary: { main: color.brand[600], light: color.brand[400], dark: color.brand[900], contrastText: "#FFFFFF" },
        secondary: { main: color.ink[500], light: color.ink[300], dark: color.ink[700] },
        success: { main: color.success.main, light: color.success.soft, dark: color.success.ink },
        warning: { main: color.warning.main, light: color.warning.soft, dark: color.warning.ink },
        error: { main: color.danger.main, light: color.danger.soft, dark: color.danger.ink },
        info: { main: color.info.main, light: color.info.soft, dark: color.info.ink },
        background: { default: color.canvas, paper: color.surface },
        text: { primary: color.ink[900], secondary: color.ink[500], disabled: color.ink[300] },
        divider: color.border,
      },
    },
    dark: {
      palette: {
        primary: { main: color.brand[400], light: color.brand[300], dark: color.brand[600], contrastText: "#0B120D" },
        secondary: { main: "#9DB0A5", light: "#C3D0C8", dark: "#6B7D72" },
        success: { main: "#8FC46A", light: "#1E2E18", dark: "#C9E4A9" },
        warning: { main: "#E0A44F", light: "#33250F", dark: "#F2C583" },
        error: { main: "#E4735F", light: "#331713", dark: "#F0A090" },
        info: { main: "#7FA8CC", light: "#15222E", dark: "#A9C6DF" },
        background: { default: "#0E130F", paper: "#161C18" },
        text: { primary: "#E6ECE7", secondary: "#9DB0A5", disabled: "#5A6B60" },
        divider: "#27312A",
      },
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: "radial-gradient(1200px 600px at 85% -10%, rgba(145,201,83,0.08), transparent 60%)",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.button,
          paddingInline: 16,
          minHeight: 38,
          transition: "background-color 150ms, border-color 150ms, color 150ms, transform 100ms",
          "&:active": { transform: "scale(0.98)" },
        },
        sizeSmall: { minHeight: 30, paddingInline: 12, fontSize: "0.8125rem" },
        sizeLarge: { minHeight: 44, paddingInline: 20 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: radius.button } } },
    MuiCard: {
      defaultProps: { elevation: 1 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.card,
          border: `1px solid ${t.palette.divider}`,
          transition: "box-shadow 200ms, border-color 200ms",
        }),
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: radius.card } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: radius.input,
          backgroundColor: t.palette.background.paper,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: t.palette.divider },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: t.palette.text.disabled },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: t.palette.primary.main, borderWidth: 1.5 },
        }),
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: "0.875rem" } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600, fontSize: "0.75rem" },
        sizeSmall: { height: 24 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: radius.sheet,
          border: `1px solid ${t.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: ({ theme: t }) => ({ borderRight: `1px solid ${t.palette.divider}` }) },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: { fontSize: "0.75rem", borderRadius: 8, padding: "6px 10px" },
      },
    },
    MuiDivider: { styleOverrides: { root: ({ theme: t }) => ({ borderColor: t.palette.divider }) } },
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme: t }) => ({
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
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

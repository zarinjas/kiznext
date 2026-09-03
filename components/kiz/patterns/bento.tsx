"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Link from "next/link"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius, gradient } from "@/lib/theme"

/**
 * Bento — a dense 12-column mosaic. Children declare their own span so a page
 * can mix a wide hero, square metrics and tall lists in one tight grid.
 *
 * Mobile collapses to 2 columns (or 1 for `span >= 6`), which keeps the top of
 * the screen information-dense instead of a long single-file scroll.
 */
export function Bento({ children, sx }: { children: React.ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", md: "repeat(12, minmax(0,1fr))" },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

export function BentoItem({
  /** Column span out of 12 on desktop. */
  span = 4,
  /** Column span out of 2 on mobile. Defaults to full width for wide items. */
  spanXs,
  children,
  delay = 0,
  sx,
}: {
  span?: number
  spanXs?: 1 | 2
  children: React.ReactNode
  delay?: number
  sx?: object
}) {
  const xs = spanXs ?? (span >= 6 ? 2 : 1)
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      sx={{
        gridColumn: { xs: `span ${xs}`, md: `span ${span}` },
        minWidth: 0,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

/**
 * MetricTile — compact bento metric. Optionally links, optionally highlights
 * when the value demands attention (e.g. pending approvals).
 */
export function MetricTile({
  label,
  value,
  icon,
  href,
  emphasis = false,
}: {
  label: string
  value: string | number
  icon?: string
  href?: string
  emphasis?: boolean
}) {
  const inner = (
    <Box
      sx={{
        height: "100%",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: emphasis ? color.borderStrong : "divider",
        backgroundColor: "background.paper",
        p: { xs: 1.75, sm: 2.25 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 1.5,
        minHeight: { xs: 104, sm: 120 },
        transition: "border-color 160ms, background-color 160ms",
        WebkitTapHighlightColor: "transparent",
        ...(href && {
          "&:active": { backgroundColor: "action.hover" },
          "@media (hover: hover)": { "&:hover": { borderColor: color.borderStrong } },
        }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 500, lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        {icon && <KIcon icon={icon} size={16} sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }} />}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Typography
          sx={{
            fontSize: { xs: 26, sm: 30 },
            fontWeight: 620,
            lineHeight: 1,
            letterSpacing: "-0.032em",
          }}
        >
          {value}
        </Typography>
        {emphasis && Number(value) > 0 && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: color.warning.main,
              alignSelf: "flex-start",
              mt: 0.5,
              flexShrink: 0,
            }}
          />
        )}
      </Box>
    </Box>
  )

  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      {inner}
    </Link>
  ) : (
    inner
  )
}

/** ActionTile — square, icon-led shortcut for the quick-actions bento. */
export function ActionTile({
  label,
  icon,
  href,
  tint,
}: {
  label: string
  icon: string
  href: string
  /** Optional `main`/`soft`/`ink` trio for a tinted icon chip. */
  tint?: { main: string; soft: string; ink: string }
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <Box
        sx={{
          height: "100%",
          minHeight: { xs: 88, sm: 100 },
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          p: { xs: 1.75, sm: 2 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 1.5,
          transition: "border-color 160ms, background-color 160ms",
          WebkitTapHighlightColor: "transparent",
          "&:active": { backgroundColor: "action.hover" },
          "@media (hover: hover)": { "&:hover": { borderColor: color.borderStrong } },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tint ? tint.soft : "action.hover",
            color: tint ? tint.ink : "var(--mui-palette-text-secondary)",
            flexShrink: 0,
          }}
        >
          <KIcon icon={icon} size={20} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 550, lineHeight: 1.3 }}>
          {label}
        </Typography>
      </Box>
    </Link>
  )
}

/** HeroTile — the soft-gradient attention panel used at the top of dashboards. */
export function HeroTile({
  eyebrow,
  title,
  body,
  action,
  tone = "default",
}: {
  eyebrow?: string
  title: React.ReactNode
  body?: React.ReactNode
  action?: React.ReactNode
  tone?: "default" | "alert"
}) {
  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100%",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundImage: gradient.hero,
        "[data-mui-color-scheme='dark'] &": {
          backgroundImage: "none",
          backgroundColor: "background.paper",
        },
        p: { xs: 2.5, sm: 3.5 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />

      <Box sx={{ position: "relative" }}>
        {eyebrow && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              mb: 1.75,
              borderRadius: 999,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              fontSize: 12,
              fontWeight: 550,
              color: "text.secondary",
            }}
          >
            {tone === "alert" && (
              <Box sx={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color.warning.main }} />
            )}
            {eyebrow}
          </Box>
        )}

        <Typography
          sx={{
            fontSize: { xs: 22, sm: 30 },
            fontWeight: 640,
            lineHeight: 1.14,
            letterSpacing: "-0.032em",
          }}
        >
          {title}
        </Typography>

        {body && (
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 1, maxWidth: 460 }}>
            {body}
          </Typography>
        )}

        {action && <Box sx={{ mt: 2.5, display: "flex", gap: 1, flexWrap: "wrap" }}>{action}</Box>}
      </Box>
    </Box>
  )
}

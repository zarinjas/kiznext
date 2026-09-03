"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "./icon"
import { color, radius } from "@/lib/theme"

/**
 * ListGroup / ListRow — the single row language for the whole app.
 *
 * Desktop: separate hairline cards with gaps.
 * Mobile:  one grouped, inset-rounded card with internal dividers — the iOS
 *          Settings pattern. This is what makes mobile read as a native app
 *          instead of a stack of web cards.
 */

export function ListGroup({
  title,
  action,
  children,
  /** `plain` keeps rows visually separate on desktop too. */
  variant = "grouped",
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  variant?: "grouped" | "plain"
}) {
  return (
    <Box>
      {(title || action) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 1,
            px: { xs: 0.5, sm: 0 },
          }}
        >
          {title && (
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "text.secondary", letterSpacing: "-0.008em" }}
            >
              {title}
            </Typography>
          )}
          {action}
        </Box>
      )}

      <Box
        sx={
          variant === "grouped"
            ? {
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                overflow: "hidden",
                "& > *:not(:last-child)": {
                  borderBottom: "1px solid",
                  borderColor: "divider",
                },
              }
            : {
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }
        }
      >
        {children}
      </Box>
    </Box>
  )
}

export function ListRow({
  icon,
  title,
  subtitle,
  meta,
  trailing,
  href,
  onClick,
  /** Show the chevron affordance (auto-on when `href` is set). */
  chevron,
  children,
}: {
  icon?: string
  title?: React.ReactNode
  subtitle?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  href?: string
  onClick?: () => void
  chevron?: boolean
  children?: React.ReactNode
}) {
  const interactive = Boolean(href || onClick)
  const showChevron = chevron ?? Boolean(href)

  const body = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        // Generous vertical rhythm = comfortable touch targets on mobile.
        px: { xs: 2, sm: 2 },
        py: { xs: 1.75, sm: 1.75 },
        minHeight: 56,
        cursor: interactive ? "pointer" : "default",
        transition: "background-color 140ms",
        WebkitTapHighlightColor: "transparent",
        ...(interactive && {
          "&:active": { backgroundColor: "action.hover" },
          "@media (hover: hover)": {
            "&:hover": { backgroundColor: "action.hover" },
          },
        }),
      }}
    >
      {icon && (
        <KIcon
          icon={icon}
          size={20}
          sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }}
        />
      )}

      {children ?? (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {title && (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 550,
                letterSpacing: "-0.011em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {meta && (
        <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0 }}>
          {meta}
        </Typography>
      )}
      {trailing && (
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {trailing}
        </Box>
      )}
      {showChevron && (
        <KIcon
          icon="chevron_right"
          size={18}
          sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }}
        />
      )}
    </Box>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {body}
      </Link>
    )
  }
  return body
}

/** Standalone bordered surface — replaces the repeated inline card recipe. */
export function Surface({
  children,
  padded = true,
  interactive = false,
  sx,
}: {
  children: React.ReactNode
  padded?: boolean
  interactive?: boolean
  sx?: object
}) {
  return (
    <Box
      sx={{
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        p: padded ? { xs: 2, sm: 2.5 } : 0,
        ...(interactive && {
          transition: "border-color 160ms, background-color 160ms",
          WebkitTapHighlightColor: "transparent",
          "&:active": { backgroundColor: "action.hover" },
          "@media (hover: hover)": {
            "&:hover": { borderColor: color.borderStrong },
          },
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

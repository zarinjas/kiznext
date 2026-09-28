"use client"

import Box from "@mui/material/Box"
import { keyframes } from "@mui/system"
import { color } from "@/lib/theme"

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.35); }
  70%  { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
`

/**
 * OfficeOpenBadge — the little "Open / Closed" pill for the KIZ office.
 * When the office is open the dot pulses so the badge reads as live, which
 * supports the goal of routing small questions online instead of to the counter.
 */
export function OfficeOpenBadge({
  open,
  openLabel = "Office Open",
  closedLabel = "Office Closed",
}: {
  open: boolean
  openLabel?: string
  closedLabel?: string
}) {
  return (
    <Box
      role="status"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.625,
        borderRadius: "999px",
        backgroundColor: open ? color.success.soft : color.neutral.soft,
        color: open ? color.success.ink : "text.secondary",
        fontSize: 12.5,
        fontWeight: 650,
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: open ? color.success.main : color.neutral.main,
          flexShrink: 0,
          ...(open && { animation: `${pulse} 2.2s ease-out infinite` }),
        }}
      />
      {open ? openLabel : closedLabel}
    </Box>
  )
}

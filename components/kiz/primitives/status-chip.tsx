"use client"

import Chip from "@mui/material/Chip"
import { statusTone, statusLabel, toneColors, type StatusTone } from "@/lib/theme"

/**
 * StatusChip — pill chip with dot, colored from the status→tone map.
 * `tone` is optional; omit it and pass `status` to auto-derive color+label.
 */
export function StatusChip({
  status,
  tone,
  size = "small",
}: {
  status?: string
  tone?: StatusTone
  size?: "small" | "medium"
}) {
  const t = tone ?? (status ? statusTone(status) : "neutral")
  const label = status ? statusLabel(status) : undefined
  const colors = toneColors(t)

  return (
    <Chip
      size={size}
      label={label}
      sx={{
        backgroundColor: colors.soft,
        color: colors.ink,
        border: "none",
        fontWeight: 600,
        fontSize: size === "small" ? "0.6875rem" : "0.75rem",
        height: size === "small" ? 24 : 28,
        "& .MuiChip-label": { px: 1.5 },
      }}
      icon={<span style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: colors.main, display: "inline-block", marginLeft: 10 }} />}
    />
  )
}

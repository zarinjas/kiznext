"use client"

import Box from "@mui/material/Box"
import { seatTone, type SeatState } from "@/lib/theme"

/**
 * BedGlyph — the seat square. Colour + fill come entirely from seatTone().
 * `maintenance` gets a diagonal hatch; `full`/`closed`/`maintenance` are inert.
 */
export function BedGlyph({
  state,
  size = 22,
  label,
}: {
  state: SeatState
  size?: number
  label?: string
}) {
  const c = seatTone(state)
  const hatch =
    state === "maintenance"
      ? `repeating-linear-gradient(45deg, ${c.fill}, ${c.fill} 3px, ${c.border}22 3px, ${c.border}22 6px)`
      : undefined

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: 1.25,
        border: "1.5px solid",
        borderColor: c.border,
        backgroundColor: c.fill,
        backgroundImage: hatch,
        color: c.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        transition: "border-color 160ms, background-color 160ms",
      }}
    >
      {label}
    </Box>
  )
}

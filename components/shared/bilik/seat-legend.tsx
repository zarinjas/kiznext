"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { seatTone, SEAT_LEGEND, type SeatState } from "@/lib/theme"

/** Material Symbol per seat state — `event_seat` is the cinema-seat metaphor. */
const LEGEND_ICON: Record<SeatState, string> = {
  available: "event_seat",
  selected_me: "event_seat",
  partial: "event_seat",
  full: "event_seat",
  maintenance: "build",
  closed: "lock",
}

const LEGEND_FILLED: Record<SeatState, boolean> = {
  available: false,
  selected_me: true,
  partial: false,
  full: true,
  maintenance: false,
  closed: false,
}

/**
 * SeatLegend — the six seat states as icons + labels. Colours come from
 * seatTone() so the legend always matches the seat grid.
 */
export function SeatLegend({ dense = false }: { dense?: boolean }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: dense ? 1.25 : 2,
        alignItems: "center",
      }}
    >
      {SEAT_LEGEND.map((state) => {
        const c = seatTone(state)
        return (
          <Box key={state} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <KIcon
              icon={LEGEND_ICON[state]}
              size={dense ? 16 : 18}
              filled={LEGEND_FILLED[state]}
              sx={{ color: c.border, opacity: state === "available" ? 0.75 : 1 }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {c.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

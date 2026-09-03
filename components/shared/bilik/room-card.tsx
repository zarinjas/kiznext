"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { seatTone, color, radius } from "@/lib/theme"
import { BedGlyph } from "./bed-glyph"
import type { RoomView } from "./types"

/**
 * RoomCard — one room in the grid. A single room shows one bed glyph; a double
 * shows two side-by-side (left | right) so partial occupancy reads at a glance.
 * The whole card is tinted by the room's aggregate seat state.
 */
export function RoomCard({
  room,
  active,
  onClick,
}: {
  room: RoomView
  active: boolean
  onClick: (room: RoomView) => void
}) {
  const c = seatTone(room.seat)
  // Full/partial rooms are still tappable to *view* occupants, even when not selectable.
  const interactive = room.seat !== "closed"
  const total = room.beds.length
  const occupied = room.beds.filter((b) => b.occupant).length

  return (
    <Box
      component="button"
      type="button"
      onClick={() => interactive && onClick(room)}
      disabled={!interactive}
      aria-label={`Room ${room.number}, ${seatTone(room.seat).label}`}
      sx={{
        appearance: "none",
        textAlign: "left",
        cursor: interactive ? "pointer" : "default",
        WebkitTapHighlightColor: "transparent",
        "&:active": interactive ? { transform: "scale(0.97)" } : undefined,
        p: { xs: 1, sm: 1.25 },
        borderRadius: `${radius.card}px`,
        border: "1.5px solid",
        borderColor: active ? color.accent[600] : room.seat === "selected_me" ? c.border : "divider",
        backgroundColor:
          room.seat === "selected_me" ? c.fill : active ? color.accent[50] : "background.paper",
        boxShadow: active ? `0 0 0 3px ${color.accent[100]}` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        minHeight: 76,
        opacity: room.seat === "closed" ? 0.55 : 1,
        transition: "border-color 160ms, box-shadow 160ms, background-color 160ms",
        ...(interactive && {
          "@media (hover: hover)": {
            "&:hover": { borderColor: color.accent[400] },
          },
        }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
        <Typography
          sx={{ fontWeight: 700, fontSize: { xs: 12.5, sm: 13.5 }, letterSpacing: "-0.02em" }}
          noWrap
        >
          {room.number}
        </Typography>
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: 999,
            backgroundColor: c.border,
            flexShrink: 0,
          }}
        />
      </Box>

      {/* Bed glyphs, centered like cinema seats. */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 0.25 }}>
        {room.beds.map((bed) => {
          // Per-bed glyph state so a double shows exactly which side is free.
          const bedState =
            room.seat === "maintenance" || room.seat === "closed"
              ? room.seat
              : bed.occupant
                ? bed.occupant.isMe
                  ? "selected_me"
                  : "full"
                : "available"
          return (
            <BedGlyph
              key={bed.id}
              state={bedState}
              size={room.type === "single" ? 30 : 24}
              label={room.type === "double" ? (bed.position === "left" ? "L" : "R") : undefined}
            />
          )
        })}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: 10.5 }} noWrap>
          {room.type === "single" ? "Single" : "Double"}
        </Typography>
        <Typography variant="caption" sx={{ color: c.ink === "#FFFFFF" ? "text.disabled" : "text.secondary", fontSize: 10.5, fontWeight: 600 }} noWrap>
          {occupied}/{total}
        </Typography>
      </Box>
    </Box>
  )
}

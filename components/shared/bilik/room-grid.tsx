"use client"

import Box from "@mui/material/Box"
import { RoomCard } from "./room-card"
import type { RoomView } from "./types"

/**
 * RoomGrid — responsive floor plan. Auto-fills thumb-friendly room cards; the
 * grid tightens on mobile so cards stay tappable without horizontal scroll.
 */
export function RoomGrid({
  rooms,
  activeRoomId,
  onSelect,
}: {
  rooms: RoomView[]
  activeRoomId: string | null
  onSelect: (room: RoomView) => void
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(auto-fill, minmax(96px, 1fr))",
          sm: "repeat(auto-fill, minmax(112px, 1fr))",
        },
        gap: { xs: 1, sm: 1.25 },
      }}
    >
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          active={room.id === activeRoomId}
          onClick={onSelect}
        />
      ))}
    </Box>
  )
}

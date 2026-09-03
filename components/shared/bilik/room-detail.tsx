"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { color, radius } from "@/lib/theme"
import { OccupantCard } from "./occupant-card"
import { BedGlyph } from "./bed-glyph"
import type { RoomView, BedView } from "./types"

/**
 * RoomDetail — the content shown when a room is opened. Shared between the
 * desktop side panel and the mobile bottom sheet. Renders each bed slot as
 * either an occupant card or a "choose this bed" affordance.
 */
export function RoomDetail({
  room,
  canSelect,
  myBedId,
  pending,
  onSelectBed,
  onRelease,
  /** Button text for a free bed. Desktop commits ("Choose"); mobile stages ("Select"). */
  selectVerb = "Choose",
  /** Bed staged (mobile) but not yet confirmed — shown highlighted. */
  stagedBedId = null,
}: {
  room: RoomView
  canSelect: boolean
  myBedId: string | null
  pending: boolean
  onSelectBed: (bed: BedView) => void
  onRelease: () => void
  selectVerb?: string
  stagedBedId?: string | null
}) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 680, letterSpacing: "-0.03em" }}>
          {room.number}
        </Typography>
        <StatusChip
          status={room.status === "available" ? "found" : room.status}
          tone={room.status === "maintenance" ? "warning" : room.status === "closed" ? "neutral" : "success"}
        />
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Floor {room.floor} · {room.type === "single" ? "Single room · 1 bed" : "Double room · 2 beds"}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {room.beds.map((bed) => {
          const isMine = bed.id === myBedId
          const label =
            room.type === "single" ? "Bed" : bed.position === "left" ? "Left bed" : "Right bed"

          if (bed.occupant) {
            return (
              <Box key={bed.id}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.disabled", fontWeight: 600, display: "block", mb: 0.5 }}
                >
                  {label}
                </Typography>
                <OccupantCard occupant={bed.occupant} />
                {isMine && canSelect && (
                  <KButton
                    variant="text"
                    size="small"
                    icon="close"
                    onClick={onRelease}
                    loading={pending}
                    sx={{ mt: 0.5, color: color.danger.ink }}
                  >
                    Release this bed
                  </KButton>
                )}
              </Box>
            )
          }

          // Free bed
          const isStaged = bed.id === stagedBedId
          return (
            <Box key={bed.id}>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 600, display: "block", mb: 0.5 }}
              >
                {label}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: `${radius.card}px`,
                  border: isStaged ? "1.5px solid" : "1px dashed",
                  borderColor: isStaged ? color.accent[400] : color.borderStrong,
                  backgroundColor: isStaged ? color.accent[50] : color.canvasSunk,
                  transition: "border-color 160ms, background-color 160ms",
                }}
              >
                <BedGlyph state={isStaged ? "selected_me" : "available"} size={30} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{isStaged ? "Selected" : "Empty"}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isStaged ? "Confirm below to lock it in" : "Available to choose"}
                  </Typography>
                </Box>
                {canSelect ? (
                  <KButton
                    size="small"
                    variant={isStaged ? "outlined" : "contained"}
                    icon={isStaged ? "check" : "add"}
                    onClick={() => onSelectBed(bed)}
                    loading={pending}
                  >
                    {isStaged ? "Selected" : selectVerb}
                  </KButton>
                ) : (
                  <KIcon icon="lock" size={18} sx={{ color: "var(--mui-palette-text-disabled)" }} />
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

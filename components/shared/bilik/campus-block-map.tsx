"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { color, radius } from "@/lib/theme"
import type { BlockView } from "./types"

interface CampusBlockMapProps {
  blocks: BlockView[]
  activeBlockId: string
  onSelectBlock: (blockId: string) => void
}

/**
 * One clickable map zone, positioned as a percentage of the map image
 * (the user-supplied layout — tuned against /uploads/campus-map.png).
 */
interface MapZone {
  /** Residence-block code (K18A…) or a landmark id. */
  code: string
  label: string
  top: string
  left: string
  width: string
  height: string
  /** Non-residence feature shown for orientation; never selectable. */
  landmark?: boolean
}

const MAP_ZONES: MapZone[] = [
  // Residence blocks
  { code: "K18A", label: "K18A", top: "18%", left: "30%", width: "7%", height: "7%" },
  { code: "K18B", label: "K18B", top: "26%", left: "23%", width: "6%", height: "6%" },
  { code: "K18C", label: "K18C", top: "41%", left: "16%", width: "6%", height: "6%" },
  { code: "K18D", label: "K18D", top: "62%", left: "10%", width: "7%", height: "7%" },
  { code: "K19D", label: "K19D", top: "26%", left: "56%", width: "7%", height: "5%" },
  { code: "K19C", label: "K19C", top: "36%", left: "58%", width: "7%", height: "5%" },
  { code: "K19B", label: "K19B", top: "41%", left: "70%", width: "6%", height: "5%" },
  { code: "K19A", label: "K19A", top: "61%", left: "79%", width: "7%", height: "5%" },
  // Landmarks (informational, not selectable)
  { code: "CAFETERIA", label: "Cafeteria", landmark: true, top: "8%", left: "56%", width: "25%", height: "8%" },
  { code: "SUTERA", label: "Sutera Hall", landmark: true, top: "16%", left: "71%", width: "15%", height: "10%" },
  { code: "PITCH", label: "Football Field", landmark: true, top: "80%", left: "79%", width: "15%", height: "10%" },
]

/** Fallback shown while the map image is missing, keeping the zones aligned. */
const FALLBACK_ASPECT = "4 / 3"

function getBlockMetrics(block: BlockView | undefined) {
  if (!block) return { total: 0, free: 0, occupied: 0, maintenance: 0 }
  let total = 0
  let free = 0
  let occupied = 0
  let maintenance = 0

  for (const floor of block.floors) {
    for (const room of floor.rooms) {
      for (const bed of room.beds) {
        if (room.status === "maintenance" || room.status === "closed") {
          maintenance += 1
          continue
        }
        total += 1
        if (bed.occupant) occupied += 1
        else free += 1
      }
    }
  }

  return { total, free, occupied, maintenance }
}

export function CampusBlockMap({ blocks, activeBlockId, onSelectBlock }: CampusBlockMapProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const blockByName = new Map(blocks.map((block) => [block.name.toUpperCase(), block]))
  const selected = blocks.find((block) => block.id === activeBlockId)

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: `${radius.cardLg}px`,
        background: "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
          pb: 1.25,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 720, fontSize: { xs: 15, sm: 17 } }}>
            Choose a block
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Tap a residence block on the map, then choose floor and bed.
          </Typography>
        </Box>
        {selected && (
          <Box
            sx={{
              px: 1,
              py: 0.55,
              borderRadius: `${radius.pill}px`,
              backgroundColor: color.accent[50],
              color: color.accent[700],
              border: "1px solid",
              borderColor: color.accent[200],
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {selected.name}
          </Box>
        )}
      </Box>

      {/* Map */}
      <Box
        sx={{
          position: "relative",
          mx: { xs: 1, sm: 1.5 },
          mb: { xs: 1, sm: 1.5 },
          borderRadius: `${radius.card}px`,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          lineHeight: 0,
        }}
      >
        {imageFailed ? (
          <Box
            sx={{
              width: "100%",
              aspectRatio: FALLBACK_ASPECT,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              background: "linear-gradient(135deg, #FFFDFA 0%, #F8FAFC 100%)",
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 15 }}>Campus map</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Add your map image as public/uploads/campus-map.png
            </Typography>
          </Box>
        ) : (
          <img
            src="/uploads/campus-map.png"
            alt="Peta Kolej Ibu Zain"
            onError={() => setImageFailed(true)}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        )}

        {/* Clickable zones overlay (percentage-based, responsive). */}
        {MAP_ZONES.map((zone) => {
          const block = blockByName.get(zone.code.toUpperCase())
          const active = block?.id === activeBlockId
          const disabled = !block
          const metrics = getBlockMetrics(block)

          if (zone.landmark) {
            return (
              <Box
                key={zone.code}
                title={zone.label}
                sx={{
                  position: "absolute",
                  top: zone.top,
                  left: zone.left,
                  width: zone.width,
                  height: zone.height,
                  cursor: "default",
                  "@media (hover: hover)": {
                    "&:hover": { outline: "2px dashed rgba(0,0,0,0.16)" },
                  },
                }}
              />
            )
          }

          return (
            <Box
              key={zone.code}
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => block && onSelectBlock(block.id)}
              onKeyDown={(event) => {
                if (!block) return
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelectBlock(block.id)
                }
              }}
              aria-label={`${zone.label}${block ? `, ${metrics.free} available beds` : ", not available"}`}
              sx={{
                position: "absolute",
                top: zone.top,
                left: zone.left,
                width: zone.width,
                height: zone.height,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                outline: "none",
                WebkitTapHighlightColor: "transparent",
                // Soft highlight so selectable zones read as targets even before hover.
                backgroundColor: active
                  ? "rgba(111,91,224,0.10)"
                  : disabled
                    ? "transparent"
                    : "rgba(0,0,0,0.02)",
                borderRadius: 4,
                boxShadow: active ? `inset 0 0 0 2px ${color.accent[600]}` : "none",
                transition: "background-color 140ms, box-shadow 140ms",
                "@keyframes mapZonePulse": {
                  "0%, 100%": { boxShadow: `inset 0 0 0 2px ${color.accent[600]}` },
                  "50%": {
                    boxShadow: `inset 0 0 0 4px ${color.accent[600]}`,
                    backgroundColor: "rgba(111,91,224,0.14)",
                  },
                },
                animation: active ? "mapZonePulse 1.3s ease-in-out infinite" : "none",
                "@media (hover: hover)": {
                  "&:hover": {
                    backgroundColor: active ? "rgba(111,91,224,0.12)" : "rgba(0,0,0,0.06)",
                    boxShadow: active
                      ? `inset 0 0 0 2px ${color.accent[600]}`
                      : "inset 0 0 0 2px rgba(0,0,0,0.25)",
                  },
                },
                "&:focus-visible": { boxShadow: `inset 0 0 0 2px ${color.accent[400]}` },
              }}
            >
              {active && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 999,
                    backgroundColor: color.accent[600],
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1.4,
                    boxShadow: `0 2px 8px rgba(111,91,224,0.35)`,
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  {metrics.free}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

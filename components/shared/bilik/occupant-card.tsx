"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import { color, radius } from "@/lib/theme"
import { initials } from "@/lib/room-selection"
import type { OccupantView } from "./types"

/**
 * OccupantCard — privacy-safe summary of who holds a bed. Short name only,
 * plus matric / religion / race / nationality as requested. Highlights when the
 * occupant is the current student.
 */
export function OccupantCard({ occupant }: { occupant: OccupantView }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: `${radius.card}px`,
        border: "1px solid",
        borderColor: occupant.isMe ? color.accent[300] : "divider",
        backgroundColor: occupant.isMe ? color.accent[50] : "background.paper",
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: 999,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: occupant.isMe ? color.accent[700] : color.brand[700],
          backgroundColor: occupant.isMe ? color.accent[100] : color.brand[50],
        }}
      >
        {initials(occupant.shortName)}
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography sx={{ fontWeight: 600, letterSpacing: "-0.011em" }} noWrap>
            {occupant.shortName}
          </Typography>
          {occupant.isMe && (
            <Chip
              label="You"
              size="small"
              sx={{
                height: 18,
                fontSize: "0.625rem",
                fontWeight: 700,
                backgroundColor: color.accent[100],
                color: color.accent[700],
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>
        {(() => {
          // Build detail lines from whatever the privacy setting allowed.
          // Limited mode → short name + nationality only.
          const line1 = [occupant.matricId, occupant.religion].filter(Boolean).join(" · ")
          const line2 = [occupant.race, occupant.nationality].filter(Boolean).join(" · ")
          return (
            <>
              {line1 && (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }} noWrap>
                  {line1}
                </Typography>
              )}
              {line2 && (
                <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }} noWrap>
                  {line2}
                </Typography>
              )}
            </>
          )
        })()}
      </Box>
    </Box>
  )
}

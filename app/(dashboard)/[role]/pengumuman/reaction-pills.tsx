"use client"

import Box from "@mui/material/Box"
import { ANNOUNCEMENT_REACTIONS, type AnnouncementReactionType } from "@/lib/announcement-meta"
import { color } from "@/lib/theme"

/**
 * The 👍 Noted / ❤️ Excited / 🙋 Interested reaction pills.
 * Shared between announcement cards (compact) and the detail dialog (full).
 * When `interactive`, tapping toggles your reaction; otherwise read-only counts.
 */

export type ReactionCounts = Record<AnnouncementReactionType, number>

interface Props {
  counts: ReactionCounts
  /** Reaction types the signed-in member has already given. */
  mine: AnnouncementReactionType[]
  interactive: boolean
  onReact?: (type: AnnouncementReactionType) => void
  busy?: boolean
  size?: "sm" | "md"
}

export function ReactionPills({ counts, mine, interactive, onReact, busy = false, size = "md" }: Props) {
  const clickable = interactive && Boolean(onReact)

  return (
    <Box role="group" aria-label="Reactions" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {ANNOUNCEMENT_REACTIONS.map((r) => {
        const active = mine.includes(r.type)
        const count = counts[r.type]
        const label = size === "sm" ? r.label : `${r.label} · ${count}`
        return (
          <Box
            key={r.type}
            component="button"
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={busy}
            tabIndex={clickable ? 0 : -1}
            onClick={(e: React.MouseEvent) => {
              if (!clickable || busy) return
              e.stopPropagation()
              onReact?.(r.type)
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              height: size === "sm" ? 26 : 34,
              px: size === "sm" ? 0.875 : 1.375,
              borderRadius: 999,
              border: "1px solid",
              borderColor: active ? color.brand[300] : "divider",
              backgroundColor: active ? color.brand[50] : "transparent",
              color: active ? color.brand[800] : "text.secondary",
              fontSize: size === "sm" ? 12 : 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              cursor: clickable ? "pointer" : "default",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              transition: "background-color 140ms, border-color 140ms, color 140ms",
              ...(clickable && {
                "&:hover": {
                  backgroundColor: active ? color.brand[100] : "action.hover",
                  borderColor: active ? color.brand[400] : color.borderStrong,
                },
                "&:active": { opacity: 0.75 },
              }),
              ...(busy && { opacity: 0.6, cursor: "default" }),
            }}
          >
            <Box component="span" sx={{ fontSize: size === "sm" ? 13 : 15, lineHeight: 1, flexShrink: 0 }}>
              {r.emoji}
            </Box>
            {size === "md" && (
              <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                {r.label}
              </Box>
            )}
            {count > 0 && (
              <Box
                component="span"
                sx={{
                  minWidth: 15,
                  textAlign: "center",
                  px: 0.375,
                  py: 0.125,
                  borderRadius: 999,
                  backgroundColor: active ? color.brand[100] : "action.hover",
                  fontSize: size === "sm" ? 10.5 : 11.5,
                  lineHeight: 1.2,
                }}
              >
                {count}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

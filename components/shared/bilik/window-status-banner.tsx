"use client"

import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { HeroTile } from "@/components/kiz/patterns/bento"
import { color } from "@/lib/theme"
import { windowLabel, type WindowState } from "@/lib/room-selection"

/** Live countdown string to a target ISO time. */
function useCountdown(targetIso: string | null): string {
  // `now` starts null so server and first client render agree (no time-based
  // text), avoiding a hydration mismatch. The interval populates it after mount.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!targetIso) return
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const t = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [targetIso])

  if (!targetIso || now === null) return "…"
  const diff = new Date(targetIso).getTime() - now
  if (diff <= 0) return "now"
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

/**
 * WindowStatusBanner — the hero at the top of the picker. Echoes the existing
 * "You have 1 booking pending" alert-hero pattern for the urgent states.
 */
export function WindowStatusBanner({
  state,
  windowName,
  opensAt,
  closesAt,
}: {
  state: WindowState
  windowName: string | null
  opensAt: string | null
  closesAt: string | null
}) {
  const openCountdown = useCountdown(state === "not_open" ? opensAt : null)
  const closeCountdown = useCountdown(
    state === "open" || state === "closing_soon" ? closesAt : null,
  )

  if (state === "not_open") {
    return (
      <HeroTile
        eyebrow={windowName ?? "Room selection"}
        title="Selection opens soon"
        body={
          <>
            You&apos;re on the accepted list. Room selection opens in{" "}
            <b>{openCountdown}</b>. You can browse the blocks below in preview mode
            until then.
          </>
        }
      />
    )
  }

  if (state === "closing_soon") {
    return (
      <HeroTile
        tone="alert"
        eyebrow={`Closing in ${closeCountdown}`}
        title="Last chance to lock your room"
        body="The selection window is closing soon. Confirm your bed now — after the deadline your choice is locked and unselected students are assigned by the office."
      />
    )
  }

  if (state === "closed") {
    return (
      <HeroTile
        eyebrow={windowName ?? "Room selection"}
        title="Selection is closed"
        body="The window has closed. Your room is shown below. If you didn't select in time, the KIZ office will assign you a room."
      />
    )
  }

  // open
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        mb: 2,
        borderRadius: 999,
        border: "1px solid",
        borderColor: color.success.soft,
        backgroundColor: color.success.soft,
        color: color.success.ink,
        width: "fit-content",
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: 999, backgroundColor: color.success.main }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {windowLabel(state)} · closes in {closeCountdown}
      </Typography>
    </Box>
  )
}

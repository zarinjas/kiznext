"use client"

import { useState, useMemo, useEffect, useCallback, useTransition, useRef } from "react"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme as useMuiTheme } from "@mui/material/styles"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import { motion, AnimatePresence } from "framer-motion"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { Surface } from "@/components/kiz/primitives/list-group"
import { color, radius } from "@/lib/theme"
import { canSelect as windowCanSelect } from "@/lib/room-selection"
import { WindowStatusBanner } from "./window-status-banner"
import { SeatLegend } from "./seat-legend"
import { RoomGrid } from "./room-grid"
import { RoomDetail } from "./room-detail"
import { CampusBlockMap } from "./campus-block-map"
import type { PickerState, RoomView, BedView, BlockView } from "./types"

export function RoomPicker({
  initial,
  selectBed,
  releaseBed,
  refresh,
}: {
  initial: PickerState
  selectBed: (bedId: string) => Promise<{ ok: boolean; error?: string }>
  releaseBed: () => Promise<{ ok: boolean; error?: string }>
  refresh: () => Promise<PickerState>
}) {
  const [state, setState] = useState<PickerState>(initial)
  const [activeBlockId, setActiveBlockId] = useState<string>(initial.blocks[0]?.id ?? "")
  const [activeFloor, setActiveFloor] = useState<number>(
    initial.blocks[0]?.floors[0]?.floor ?? 1,
  )
  const [openRoom, setOpenRoom] = useState<RoomView | null>(null)
  // Mobile stages a bed here first; the sticky bar carries the Confirm action.
  // Nothing is committed until Confirm — this is what gives the native
  // seat-booking feel instead of an instant write inside the sheet.
  const [staged, setStaged] = useState<{ room: RoomView; bed: BedView } | null>(null)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)
  // Anchor for the "Change" action — scrolls the picker back into view.
  const pickerRef = useRef<HTMLDivElement | null>(null)

  const scrollToPicker = useCallback(() => {
    pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // The bottom sheet is a real MUI Modal: when open it locks body scroll.
  // On desktop it's hidden — but an open hidden modal would still lock scroll
  // (ModalManager sets `overflow: hidden` regardless of CSS visibility), which
  // is exactly the "can't scroll after selecting a room" bug. Gate it to mobile.
  const theme = useMuiTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const editable = windowCanSelect(state.windowState)

  // Poll for live occupancy while the picker is open and editable.
  useEffect(() => {
    if (!editable) return
    const t = setInterval(async () => {
      const next = await refresh()
      setState(next)
      // keep the open room in sync
      setOpenRoom((cur) => {
        if (!cur) return cur
        for (const b of next.blocks)
          for (const f of b.floors) {
            const found = f.rooms.find((r) => r.id === cur.id)
            if (found) return found
          }
        return cur
      })
    }, 5000)
    return () => clearInterval(t)
  }, [editable, refresh])

  const activeBlock: BlockView | undefined = useMemo(
    () => state.blocks.find((b) => b.id === activeBlockId) ?? state.blocks[0],
    [state.blocks, activeBlockId],
  )
  const floorRooms = useMemo(
    () => activeBlock?.floors.find((f) => f.floor === activeFloor)?.rooms ?? [],
    [activeBlock, activeFloor],
  )

  const applyResult = useCallback(
    async (res: { ok: boolean; error?: string }, successMsg: string) => {
      if (res.ok) {
        const next = await refresh()
        setState(next)
        setToast({ msg: successMsg, sev: "success" })
        setOpenRoom(null)
        setStaged(null)
      } else {
        // Refresh anyway — the grid may have changed under us (race).
        const next = await refresh()
        setState(next)
        setToast({ msg: res.error ?? "Oops, that didn't work — give it another go.", sev: "error" })
        setStaged(null)
      }
    },
    [refresh],
  )

  /** Desktop: commit immediately from the persistent side panel. */
  const handleSelectBed = (bed: BedView) => {
    startTransition(async () => {
      const res = await selectBed(bed.id)
      await applyResult(res, "Nice, bed locked in! 🛏️ You can still swap it before the window closes.")
    })
  }

  /** Mobile: stage the bed, close the sheet, let the sticky bar confirm. */
  const handleStageBed = (bed: BedView) => {
    if (openRoom) setStaged({ room: openRoom, bed })
    setOpenRoom(null)
  }

  /** Mobile: commit the staged bed from the sticky Confirm button. */
  const handleConfirmStaged = () => {
    if (!staged) return
    startTransition(async () => {
      const res = await selectBed(staged.bed.id)
      await applyResult(res, "Nice, bed locked in! 🛏️ You can still swap it before the window closes.")
    })
  }

  const handleRelease = () => {
    startTransition(async () => {
      const res = await releaseBed()
      await applyResult(res, "All good — bed released back to the pool.")
    })
  }

  const stagedLabel = (position: string) =>
    position === "single" ? "Single bed" : position === "left" ? "Left bed" : "Right bed"

  // ── Empty / gate states ────────────────────────────────────────────────
  if (!state.eligible) {
    return (
      <Box sx={{ maxWidth: 760, mx: "auto" }}>
        <PageHeader overline="Residence" title="Choose your room" />
        <KEmpty
          icon="how_to_reg"
          title="You're not on the current intake"
          body={
            state.reason ??
            "If you were accepted through eKolej, contact the KIZ office to be added to the room-selection list."
          }
        />
      </Box>
    )
  }

  const myPick = state.myPick

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", pb: { xs: 12, md: 0 } }}>
      <PageHeader
        overline="Residence"
        title="Choose your room"
        subtitle="Pick a block, floor, then tap a bed — like choosing a seat. Change it anytime until the window closes."
      />

      <WindowStatusBanner
        state={state.windowState}
        windowName={state.window?.name ?? null}
        opensAt={state.window?.opensAt ?? null}
        closesAt={state.window?.closesAt ?? null}
      />

      {/* Current pick summary (desktop inline; mobile has the sticky bar). */}
      {myPick && (
        <Surface
          sx={{
            mb: 2,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 1.5,
            borderColor: color.accent[300],
            backgroundColor: color.accent[50],
          }}
        >
          <KIcon icon="check_circle" size={22} filled sx={{ color: color.accent[600] }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>
              Your room: {myPick.blockName} · {myPick.roomNumber}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {myPick.position === "single"
                ? "Single bed"
                : myPick.position === "left"
                  ? "Left bed"
                  : "Right bed"}
              {editable && " · you can change until the window closes"}
            </Typography>
          </Box>
          {editable && (
            <KButton variant="outlined" size="small" icon="swap_horiz" onClick={scrollToPicker}>
              Change
            </KButton>
          )}
        </Surface>
      )}

      <Box ref={pickerRef} sx={{ mb: 2, scrollMarginTop: { md: 84 } }}>
        <CampusBlockMap
          blocks={state.blocks}
          activeBlockId={activeBlock?.id ?? ""}
          onSelectBlock={(blockId) => {
            const next = state.blocks.find((block) => block.id === blockId)
            setActiveBlockId(blockId)
            setActiveFloor(next?.floors[0]?.floor ?? 1)
            setOpenRoom(null)
            setStaged(null)
          }}
        />
      </Box>

      {/* Floor pills */}
      <Box
        className="scroll-x"
        sx={{
          display: "flex",
          gap: 0.75,
          mb: 2,
          overflowX: "auto",
          pb: 0.5,
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {activeBlock?.floors.map((f) => {
          const active = f.floor === activeFloor
          return (
            <Box
              component="button"
              key={f.floor}
              onClick={() => {
                setActiveFloor(f.floor)
                setOpenRoom(null)
                setStaged(null)
              }}
              sx={{
                flexShrink: 0,
                px: 1.75,
                py: 0.6,
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? color.accent[400] : "divider",
                backgroundColor: active ? color.accent[50] : "transparent",
                color: active ? color.accent[700] : "text.secondary",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Floor {f.floor}
            </Box>
          )
        })}
      </Box>

      {/* Legend — full on sm+, compact scrollable rail on phones. The two
          instances are mutually exclusive (sm boundary), so only one shows. */}
      <Box sx={{ display: { xs: "none", sm: "block" }, mb: 2 }}>
        <SeatLegend />
      </Box>
      <Box
        className="scroll-x"
        sx={{
          display: { xs: "block", sm: "none" },
          mb: 2,
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box sx={{ width: "max-content" }}>
          <SeatLegend dense />
        </Box>
      </Box>

      {/* Grid + desktop detail panel */}
      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {floorRooms.length > 0 ? (
            <RoomGrid rooms={floorRooms} activeRoomId={openRoom?.id ?? null} onSelect={setOpenRoom} />
          ) : (
            <KEmpty icon="meeting_room" title="No rooms on this floor" body="Try another floor or block." />
          )}
        </Box>

        {/* Desktop sticky detail panel */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            width: 340,
            flexShrink: 0,
            position: "sticky",
            top: 84,
          }}
        >
          <Surface>
            {openRoom ? (
              <RoomDetail
                room={openRoom}
                canSelect={editable}
                myBedId={myPick?.bedId ?? null}
                pending={pending}
                onSelectBed={handleSelectBed}
                onRelease={handleRelease}
              />
            ) : (
              <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    mx: "auto",
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "action.hover",
                    color: "text.disabled",
                  }}
                >
                  <KIcon icon="chair" size={24} />
                </Box>
                <Typography sx={{ fontWeight: 600 }}>Pick a room</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  Tap any room in the grid to see its beds and who&apos;s already there.
                </Typography>
              </Box>
            )}
          </Surface>
        </Box>
      </Box>

      {/* Mobile bottom sheet. Only opens on phones — on desktop `openRoom`
          drives the sticky side panel instead, and this drawer must stay closed
          so it never locks body scroll while invisible. */}
      <Drawer
        anchor="bottom"
        open={isMobile && Boolean(openRoom)}
        onClose={() => setOpenRoom(null)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "82dvh",
              pb: "calc(env(safe-area-inset-bottom) + 16px)",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1.25, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 5, borderRadius: 999, backgroundColor: "divider" }} />
        </Box>
        <Box sx={{ px: 2.5, pt: 1 }}>
          {openRoom && (
            <RoomDetail
              room={openRoom}
              canSelect={editable}
              myBedId={myPick?.bedId ?? null}
              pending={pending}
              // Mobile stages instead of committing; the sheet's button reads
              // "Select" and the sticky bar carries the real Confirm.
              selectVerb="Select"
              stagedBedId={staged?.room.id === openRoom.id ? staged.bed.id : null}
              onSelectBed={handleStageBed}
              onRelease={handleRelease}
            />
          )}
        </Box>
      </Drawer>

      {/* Mobile sticky action bar — native seat-booking feel.
          Priority: staged (Confirm) > confirmed pick (summary) > empty prompt. */}
      <Box
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(56px + env(safe-area-inset-bottom))",
          zIndex: 15,
          px: 2,
          py: 1.5,
          borderTop: "1px solid",
          borderColor: staged ? color.accent[300] : "divider",
          backgroundColor: staged ? color.accent[50] : "background.paper",
          transition: "background-color 200ms, border-color 200ms",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {staged ? (
            <Box
              key="staged"
              component={motion.div}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: color.accent[700], fontWeight: 700, display: "block" }}>
                  Selected — not saved yet
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }} noWrap>
                  {staged.room.number} · {stagedLabel(staged.bed.position)}
                </Typography>
              </Box>
              <KButton variant="text" size="small" onClick={() => setStaged(null)} disabled={pending}>
                Cancel
              </KButton>
              <KButton size="large" icon="check_circle" onClick={handleConfirmStaged} loading={pending}>
                Confirm
              </KButton>
            </Box>
          ) : myPick ? (
            <Box
              key="pick"
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: `${radius.card}px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.accent[100],
                  color: color.accent[700],
                  flexShrink: 0,
                }}
              >
                <KIcon icon="check_circle" size={20} filled />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5 }} noWrap>
                  {myPick.blockName} · {myPick.roomNumber}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {stagedLabel(myPick.position)}
                  {editable ? " · tap a room to change" : " · locked"}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography
              key="empty"
              component={motion.p}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              variant="body2"
              sx={{ color: "text.secondary", textAlign: "center", fontWeight: 500, m: 0 }}
            >
              {editable ? "Tap a room, then select a bed" : "Selection is not open"}
            </Typography>
          )}
        </AnimatePresence>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: { xs: "calc(120px + env(safe-area-inset-bottom))", md: 24 } }}
      >
        {toast ? (
          <Alert severity={toast.sev} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}

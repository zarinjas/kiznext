"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import {
  LAUNDRY_DEFAULT_DURATION,
  LAUNDRY_DURATIONS,
  LAUNDRY_MAX_MINUTES,
  LAUNDRY_MIN_MINUTES,
  formatRemaining,
  type LaundryMachineView,
  type LaundryReminderView,
  type LaundrySnapshot,
} from "@/lib/laundry-meta"
import { cancelLaundryReminder, getLaundrySnapshotAction, setLaundryReminder } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ListGroup, ListRow, Surface } from "@/components/kiz/primitives/list-group"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

function formatClock(ms: number): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms))
}

function outcomeLabel(r: LaundryReminderView, nowMs: number): string {
  if (r.endedReason === "cancelled") return "Cancelled"
  if (r.endedReason === "superseded") return "Replaced"
  if (r.endedReason === "cleared") return "Cleared"
  return new Date(r.endsAt).getTime() > nowMs ? "Active" : "Completed"
}

const selectableStates = new Set(["no_active", "timer_ended"])

export function LaundryClient({ initialSnapshot }: { initialSnapshot: LaundrySnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [tab, setTab] = useState<"status" | "mine">("status")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [duration, setDuration] = useState<number>(LAUNDRY_DEFAULT_DURATION)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState(String(LAUNDRY_DEFAULT_DURATION))
  const [submitting, setSubmitting] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState<LaundryMachineView | null>(null)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)

  const offsetRef = useRef(0)
  const [nowMs, setNowMs] = useState(() => new Date(initialSnapshot.serverNow).getTime())

  useEffect(() => {
    offsetRef.current = new Date(initialSnapshot.serverNow).getTime() - Date.now()
    const id = window.setInterval(() => setNowMs(Date.now() + offsetRef.current), 1000)
    return () => window.clearInterval(id)
  }, [initialSnapshot.serverNow])

  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const next = await getLaundrySnapshotAction()
        offsetRef.current = new Date(next.serverNow).getTime() - Date.now()
        setSnapshot(next)
      } catch {
        // transient — keep the last snapshot
      }
    }, 20000)
    return () => window.clearInterval(id)
  }, [])

  const selected = useMemo(
    () => snapshot.machines.find((m) => m.id === selectedId) ?? null,
    [snapshot.machines, selectedId],
  )

  const endsAtMs = nowMs + duration * 60_000
  const activeReminder = snapshot.myActive

  function chooseMachine(m: LaundryMachineView) {
    if (!selectableStates.has(m.state)) return
    setSelectedId(m.id)
    setCustomOpen(false)
    setDuration(LAUNDRY_DEFAULT_DURATION)
  }

  function pickDuration(minutes: number) {
    setDuration(minutes)
    setCustomOpen(false)
  }

  function applyCustom() {
    const n = Number(customValue)
    if (!Number.isInteger(n) || n < LAUNDRY_MIN_MINUTES || n > LAUNDRY_MAX_MINUTES) {
      setToast({ msg: `Enter a whole number between ${LAUNDRY_MIN_MINUTES} and ${LAUNDRY_MAX_MINUTES} minutes.`, sev: "error" })
      return
    }
    setDuration(n)
    setCustomOpen(false)
  }

  async function startReminder(machine: LaundryMachineView) {
    setConfirmOverwrite(null)
    setSubmitting(true)
    try {
      await setLaundryReminder(machine.id, duration)
      const next = await getLaundrySnapshotAction()
      offsetRef.current = new Date(next.serverNow).getTime() - Date.now()
      setSnapshot(next)
      setSelectedId(null)
      setToast({ msg: `Reminder set — we'll show the timer for ${machine.name}.`, sev: "success" })
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Couldn't set the reminder — try again.", sev: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  function onStartClick() {
    if (!selected) return
    if (selected.reminder && selected.state === "laundry_active" && !selected.reminder.mine) {
      setConfirmOverwrite(selected)
      return
    }
    void startReminder(selected)
  }

  async function cancelMine(reminderId: string) {
    setSubmitting(true)
    try {
      await cancelLaundryReminder(reminderId)
      const next = await getLaundrySnapshotAction()
      offsetRef.current = new Date(next.serverNow).getTime() - Date.now()
      setSnapshot(next)
      setToast({ msg: "Reminder cancelled.", sev: "success" })
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : "Couldn't cancel — try again.", sev: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const activeStep = selected ? 1 : 0

  return (
    <>
      <Stepper activeStep={activeStep} />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2.5, minHeight: 40, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab value="status" label="Machine Status" sx={{ textTransform: "none", fontWeight: 600 }} />
        <Tab value="mine" label="My Laundry Reminder" sx={{ textTransform: "none", fontWeight: 600 }} />
      </Tabs>

      {tab === "status" ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.6fr) minmax(300px, 1fr)" },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 650, mb: 1.5 }}>Select a Machine</Typography>
            {snapshot.machines.length === 0 ? (
              <KEmpty icon="local_laundry_service" title="No machines yet" body="The KIZ office hasn't added any laundry machines." />
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" },
                  gap: 1.5,
                }}
              >
                {snapshot.machines.map((m) => (
                  <MachineCard
                    key={m.id}
                    machine={m}
                    nowMs={nowMs}
                    selected={m.id === selectedId}
                    onSelect={() => chooseMachine(m)}
                    defaultImageUrl={snapshot.defaultImageUrl}
                  />
                ))}
              </Box>
            )}

            <Surface padded sx={{ mt: 2.5, display: "flex", gap: 1.25, alignItems: "flex-start" }}>
              <Box sx={{ color: "text.disabled", mt: "1px" }}>
                <KIcon icon="info" size={18} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>Reminder-based status</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Machine activity is based on reminders set by residents and may not reflect actual availability.
                </Typography>
              </Box>
            </Surface>
          </Box>

          <Surface padded sx={{ position: { md: "sticky" }, top: { md: 76 } }}>
            <Typography sx={{ fontWeight: 650, mb: 1.5 }}>Set Laundry Reminder</Typography>

            {!selected ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Pick an available machine to set a reminder.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Selected machine</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 0.5 }}>
                    <MachineThumb machine={selected} size={44} fallbackUrl={snapshot.defaultImageUrl} />
                    <Typography sx={{ fontWeight: 650 }}>{selected.name}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                    Cycle Duration
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {LAUNDRY_DURATIONS.map((d) => (
                      <Button
                        key={d}
                        size="small"
                        variant={!customOpen && duration === d ? "contained" : "outlined"}
                        onClick={() => pickDuration(d)}
                        sx={{ textTransform: "none", minWidth: 64 }}
                      >
                        {d} min
                      </Button>
                    ))}
                    <Button
                      size="small"
                      variant={customOpen ? "contained" : "outlined"}
                      onClick={() => {
                        setCustomOpen(true)
                        setCustomValue(String(duration))
                      }}
                      sx={{ textTransform: "none", minWidth: 64 }}
                    >
                      Custom
                    </Button>
                  </Box>
                  {customOpen && (
                    <Box sx={{ display: "flex", gap: 1, mt: 1.25, alignItems: "center" }}>
                      <TextField
                        type="number"
                        size="small"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        sx={{ width: 110 }}
                      />
                      <Button size="small" variant="text" onClick={applyCustom} sx={{ textTransform: "none" }}>
                        Set
                      </Button>
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        {LAUNDRY_MIN_MINUTES}–{LAUNDRY_MAX_MINUTES} min
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Estimated end time</Typography>
                  <Typography sx={{ fontSize: 30, fontWeight: 680, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                    {formatClock(endsAtMs)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Your laundry should be ready at {formatClock(endsAtMs)}.
                  </Typography>
                </Box>

                <KButton loading={submitting} onClick={onStartClick} sx={{ width: "100%" }}>
                  Start Reminder
                </KButton>
                <Button
                  variant="text"
                  onClick={() => setSelectedId(null)}
                  sx={{ textTransform: "none", alignSelf: "center", color: "text.secondary" }}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Surface>
        </Box>
      ) : (
        <Box sx={{ maxWidth: 720 }}>
          {activeReminder ? (
            <Surface padded sx={{ mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 650 }}>{activeReminder.machineName}</Typography>
                    <StatusChip status="laundry_active" />
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {formatRemaining(new Date(activeReminder.endsAt).getTime() - nowMs)} · ends at{" "}
                    {formatClock(new Date(activeReminder.endsAt).getTime())}
                  </Typography>
                </Box>
                <KButton
                  variant="outlined"
                  loading={submitting}
                  onClick={() => cancelMine(activeReminder.id)}
                  sx={{ textTransform: "none" }}
                >
                  Cancel reminder
                </KButton>
              </Box>
            </Surface>
          ) : (
            <Surface padded sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                You have no active reminder. Set one from the Machine Status tab.
              </Typography>
            </Surface>
          )}

          <Typography sx={{ fontWeight: 650, mb: 1.5 }}>History</Typography>
          {snapshot.myHistory.length === 0 ? (
            <KEmpty icon="history" title="Nothing here yet" body="Your past laundry reminders will show up here." />
          ) : (
            <ListGroup>
              {snapshot.myHistory.map((r) => {
                const active = !r.endedAt && new Date(r.endsAt).getTime() > nowMs
                return (
                  <ListRow
                    key={r.id}
                    icon="local_laundry_service"
                    title={r.machineName}
                    subtitle={`${formatClock(new Date(r.startedAt).getTime())} – ${formatClock(new Date(r.endsAt).getTime())} · ${r.durationMinutes} min`}
                    trailing={
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: active ? "warning.main" : "text.secondary" }}
                      >
                        {outcomeLabel(r, nowMs)}
                      </Typography>
                    }
                  />
                )
              })}
            </ListGroup>
          )}
        </Box>
      )}

      <KDialog
        open={Boolean(confirmOverwrite)}
        onClose={() => setConfirmOverwrite(null)}
        title="Replace the active reminder?"
        icon="swap_horiz"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setConfirmOverwrite(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <KButton onClick={() => confirmOverwrite && startReminder(confirmOverwrite)}>Replace</KButton>
          </>
        }
      >
        <Typography variant="body2">
          {confirmOverwrite?.name} is currently in use by {confirmOverwrite?.reminder?.userName ?? "another resident"}.
          Starting your reminder will replace their timer.
        </Typography>
      </KDialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.sev ?? "success"} variant="filled" onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  )
}

function MachineThumb({ machine, size = 96, fallbackUrl }: { machine: LaundryMachineView; size?: number; fallbackUrl?: string | null }) {
  const src = machine.imageUrl ?? fallbackUrl
  if (src) {
    return (
      <Box
        component="img"
        src={src}
        alt={machine.name}
        sx={{ width: size, height: size, objectFit: "cover", borderRadius: 1.5, flexShrink: 0, border: "1px solid", borderColor: "divider" }}
      />
    )
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1.5,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: color.canvasSunk,
        color: "text.disabled",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <KIcon icon="local_laundry_service" size={Math.round(size * 0.42)} />
    </Box>
  )
}

function MachineCard({
  machine,
  nowMs,
  selected,
  onSelect,
  defaultImageUrl,
}: {
  machine: LaundryMachineView
  nowMs: number
  selected: boolean
  onSelect: () => void
  defaultImageUrl: string | null
}) {
  const selectable = selectableStates.has(machine.state)
  const remaining = machine.reminder ? new Date(machine.reminder.endsAt).getTime() - nowMs : 0

  return (
    <Box
      role="button"
      aria-disabled={!selectable}
      onClick={onSelect}
      sx={{
        position: "relative",
        p: 1.5,
        borderRadius: "18px",
        border: "1.5px solid",
        borderColor: selected ? "primary.main" : "divider",
        backgroundColor: "background.paper",
        cursor: selectable ? "pointer" : "not-allowed",
        opacity: machine.state === "out_of_service" ? 0.7 : 1,
        transition: "border-color 140ms, box-shadow 140ms",
        "&:hover": selectable ? { borderColor: selected ? "primary.main" : color.borderStrong } : undefined,
      }}
    >
      {selected && (
        <Box
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: "primary.main",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <KIcon icon="check" size={15} />
        </Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", mb: 1.25 }}>
        <MachineThumb machine={machine} size={92} fallbackUrl={defaultImageUrl} />
      </Box>

      <Typography sx={{ fontWeight: 650, textAlign: "center" }}>{machine.name}</Typography>
      {machine.location && (
        <Typography variant="caption" sx={{ color: "text.disabled", display: "block", textAlign: "center" }}>
          {machine.location}
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
        <StatusChip status={machine.state} />
        {machine.state === "laundry_active" && remaining > 0 && (
          <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600 }}>
            · {formatRemaining(remaining)}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

function Stepper({ activeStep }: { activeStep: number }) {
  const steps = ["Select machine", "Set duration", "Confirmation"]
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 0.5, sm: 1.5 },
        mb: 2.5,
        flexWrap: "wrap",
      }}
    >
      {steps.map((label, i) => (
        <Box key={label} sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12.5,
              fontWeight: 700,
              backgroundColor: i <= activeStep ? "primary.main" : "action.disabledBackground",
              color: i <= activeStep ? "#fff" : "text.disabled",
            }}
          >
            {i + 1}
          </Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: i <= activeStep ? "text.primary" : "text.disabled", whiteSpace: "nowrap" }}
          >
            {label}
          </Typography>
          {i < steps.length - 1 && (
            <Box sx={{ width: { xs: 18, sm: 56 }, height: "1px", backgroundColor: "divider", ml: { xs: 0.25, sm: 0.5 } }} />
          )}
        </Box>
      ))}
    </Box>
  )
}

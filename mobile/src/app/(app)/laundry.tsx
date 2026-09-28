import {
  LAUNDRY_DEFAULT_DURATION,
  LAUNDRY_DURATIONS,
  LAUNDRY_MAX_MINUTES,
  LAUNDRY_MIN_MINUTES,
  LAUNDRY_SELECTABLE_STATES,
  LAUNDRY_STATE_META,
  formatRemaining,
  type LaundryMachineView,
  type LaundryReminderView,
} from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { useEffect, useRef, useState } from "react"

import { ApiError } from "@/lib/api"
import { absoluteUrl } from "@/lib/config"
import { useCancelLaundry, useLaundry, useStartLaundry } from "@/lib/hooks"
import {
  AsyncBoundary,
  Box,
  CardGrid,
  Icon,
  KButton,
  KEmpty,
  KPill,
  PillRail,
  PressScale,
  Screen,
  Sheet,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  TextField,
  useToast,
} from "@/ui"

const SELECTABLE = new Set<string>(LAUNDRY_SELECTABLE_STATES)

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

export default function LaundryScreen() {
  const { data, isLoading, isError, refetch } = useLaundry()
  const start = useStartLaundry()
  const cancel = useCancelLaundry()
  const toast = useToast()

  const [tab, setTab] = useState<"status" | "mine">("status")
  const [selected, setSelected] = useState<LaundryMachineView | null>(null)
  const [duration, setDuration] = useState<number>(LAUNDRY_DEFAULT_DURATION)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState(String(LAUNDRY_DEFAULT_DURATION))
  const [customError, setCustomError] = useState<string | null>(null)
  const [confirmReplace, setConfirmReplace] = useState<LaundryMachineView | null>(null)

  const offsetRef = useRef(0)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!data?.serverNow) return
    offsetRef.current = new Date(data.serverNow).getTime() - Date.now()
  }, [data?.serverNow])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now() + offsetRef.current), 1000)
    return () => clearInterval(id)
  }, [])

  function chooseMachine(m: LaundryMachineView) {
    if (!SELECTABLE.has(m.state)) return
    setSelected(m)
    setCustomOpen(false)
    setCustomError(null)
    setDuration(LAUNDRY_DEFAULT_DURATION)
  }

  function applyCustom() {
    const n = Number(customValue)
    if (!Number.isInteger(n) || n < LAUNDRY_MIN_MINUTES || n > LAUNDRY_MAX_MINUTES) {
      setCustomError(`Enter a whole number between ${LAUNDRY_MIN_MINUTES} and ${LAUNDRY_MAX_MINUTES}.`)
      return
    }
    setCustomError(null)
    setDuration(n)
    setCustomOpen(false)
  }

  async function doStart(m: LaundryMachineView) {
    setConfirmReplace(null)
    try {
      await start.mutateAsync({ machineId: m.id, durationMinutes: duration })
      setSelected(null)
      // `toast.success` fires `notifySuccess()` for us (see ui/toast.tsx).
      toast.success(`Reminder set — we'll show the timer for ${m.name}.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't set the reminder.")
    }
  }

  function onStartClick() {
    if (!selected) return
    if (selected.reminder && !selected.reminder.mine) {
      setConfirmReplace(selected)
      // `toast.warning` fires `notifyWarning()` for us (see ui/toast.tsx).
      toast.warning(
        `${selected.name} already has a running timer — starting yours will replace it.`
      )
      return
    }
    void doStart(selected)
  }

  async function cancelMine(reminderId: string) {
    try {
      await cancel.mutateAsync(reminderId)
      toast.success("Reminder cancelled.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't cancel.")
    }
  }

  const endsAtMs = nowMs + duration * 60_000

  return (
    <Screen scroll edges={[]}>
      <Box flexDirection="row" gap="s" paddingTop="m">
        <Box flex={1}>
          <KPill
            label="Machine Status"
            icon="local_laundry_service"
            selected={tab === "status"}
            onPress={() => setTab("status")}
          />
        </Box>
        <Box flex={1}>
          <KPill
            label="My Reminder"
            icon="timer"
            selected={tab === "mine"}
            onPress={() => setTab("mine")}
          />
        </Box>
      </Box>

      <Box marginTop="m">
        <AsyncBoundary
          data={data}
          isLoading={isLoading}
          isError={isError}
          refetch={refetch}
          skeleton={<Skeleton.Grid count={4} />}
          errorTitle="Couldn't load laundry"
          errorMessage="We couldn't reach the machine list. Check your connection and try again."
        >
          {(snapshot) =>
            tab === "status" ? (
              <>
                <Text variant="heading" marginTop="m" marginBottom="m">
                  Select a Machine
                </Text>

                {snapshot.machines.length === 0 ? (
                  <KEmpty
                    icon="local_laundry_service"
                    title="No machines yet"
                    message="The KIZ office hasn't added any laundry machines. Check back soon, or ask at the office."
                  />
                ) : (
                  <CardGrid
                    items={snapshot.machines}
                    phoneColumns={2}
                    keyExtractor={(m) => m.id}
                    renderItem={(m) => (
                      <MachineCard
                        machine={m}
                        nowMs={nowMs}
                        selected={selected?.id === m.id}
                        defaultImageUrl={snapshot.defaultImageUrl}
                        onSelect={() => chooseMachine(m)}
                      />
                    )}
                  />
                )}

                <Box marginTop="l">
                  <Surface>
                    <Text variant="bodyStrong">Reminder-based status</Text>
                    <Text variant="caption" marginTop="xs">
                      Machine activity is based on reminders set by residents and may not reflect
                      actual availability.
                    </Text>
                  </Surface>
                </Box>
              </>
            ) : (
              <MyReminderTab
                active={snapshot.myActive}
                history={snapshot.myHistory}
                nowMs={nowMs}
                cancelling={cancel.isPending}
                onCancel={cancelMine}
                onPickMachine={() => setTab("status")}
              />
            )
          }
        </AsyncBoundary>
      </Box>

      <Box height={32} />

      <SetReminderSheet
        machine={selected}
        duration={duration}
        customOpen={customOpen}
        customValue={customValue}
        customError={customError}
        endsAtMs={endsAtMs}
        submitting={start.isPending}
        onClose={() => setSelected(null)}
        onPickDuration={(d) => {
          setDuration(d)
          setCustomOpen(false)
          setCustomError(null)
        }}
        onToggleCustom={(open) => {
          setCustomOpen(open)
          setCustomValue(String(duration))
          setCustomError(null)
        }}
        onChangeCustom={(v) => {
          setCustomValue(v)
          setCustomError(null)
        }}
        onApplyCustom={applyCustom}
        onStart={onStartClick}
      />

      <Sheet
        visible={Boolean(confirmReplace)}
        onClose={() => setConfirmReplace(null)}
        title="Replace the active reminder?"
        subtitle={`${confirmReplace?.name ?? "This machine"} is in use by ${
          confirmReplace?.reminder?.userName ?? "another resident"
        }.`}
        footer={
          <Box flexDirection="row" gap="m">
            <Box flex={1}>
              <KButton label="Cancel" variant="secondary" onPress={() => setConfirmReplace(null)} />
            </Box>
            <Box flex={1}>
              <KButton
                label="Replace"
                onPress={() => confirmReplace && doStart(confirmReplace)}
                loading={start.isPending}
              />
            </Box>
          </Box>
        }
      >
        <Text variant="body">
          Starting your reminder will replace their timer. Only do this if the machine is actually
          free.
        </Text>
      </Sheet>
    </Screen>
  )
}

function MachineCard({
  machine,
  nowMs,
  selected,
  defaultImageUrl,
  onSelect,
}: {
  machine: LaundryMachineView
  nowMs: number
  selected: boolean
  defaultImageUrl: string | null
  onSelect: () => void
}) {
  const theme = useTheme()
  const meta = LAUNDRY_STATE_META[machine.state]
  const selectable = SELECTABLE.has(machine.state)
  const photo = absoluteUrl(machine.imageUrl ?? defaultImageUrl)
  const remaining = machine.reminder ? new Date(machine.reminder.endsAt).getTime() - nowMs : 0

  return (
    <PressScale
      onPress={selectable ? onSelect : undefined}
      disabled={!selectable}
      haptic={selectable}
      accessibilityRole="button"
      accessibilityLabel={`${machine.name}${machine.location ? `, ${machine.location}` : ""}. ${
        meta.label
      }${selectable ? ". Tap to set a reminder." : ""}`}
      accessibilityState={{ selected, disabled: !selectable }}
      style={{ minHeight: 44 }}
    >
      <Box
        padding="m"
        borderRadius="cardLg"
        borderWidth={selected ? 1.5 : 1}
        borderColor={selected ? "brand600" : "border"}
        backgroundColor="surface"
        opacity={machine.state === "out_of_service" ? 0.7 : 1}
      >
        <Box alignItems="center" marginBottom="s">
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: 84, height: 84, borderRadius: theme.borderRadii.card }}
              contentFit="cover"
            />
          ) : (
            <Box
              width={84}
              height={84}
              borderRadius="card"
              backgroundColor="canvasSunk"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="local_laundry_service" size={34} color={theme.colors.ink300} />
            </Box>
          )}
        </Box>

        <Text variant="bodyStrong" textAlign="center" numberOfLines={1}>
          {machine.name}
        </Text>
        {machine.location ? (
          <Text variant="caption" textAlign="center" numberOfLines={1}>
            {machine.location}
          </Text>
        ) : null}

        <Box marginTop="s" alignItems="center" gap="xs">
          <StatusChip label={meta.label} tone={meta.tone} icon={meta.icon} />
          {machine.state === "laundry_active" && remaining > 0 ? (
            <Text variant="caption" style={{ color: theme.colors.warningInk, fontWeight: "600" }}>
              {formatRemaining(remaining)}
            </Text>
          ) : null}
        </Box>
      </Box>
    </PressScale>
  )
}

function MyReminderTab({
  active,
  history,
  nowMs,
  cancelling,
  onCancel,
  onPickMachine,
}: {
  active: LaundryReminderView | null
  history: LaundryReminderView[]
  nowMs: number
  cancelling: boolean
  onCancel: (id: string) => void
  onPickMachine: () => void
}) {
  const theme = useTheme()
  return (
    <Box marginTop="l" gap="l">
      {active ? (
        <Surface>
          <Box flexDirection="row" alignItems="center" gap="s">
            <Text variant="bodyStrong" flex={1} numberOfLines={1}>
              {active.machineName}
            </Text>
            <StatusChip label={LAUNDRY_STATE_META.laundry_active.label} tone="warning" icon="timer" />
          </Box>
          <Text variant="caption" marginTop="xs">
            {formatRemaining(new Date(active.endsAt).getTime() - nowMs)} · ends at{" "}
            {formatClock(new Date(active.endsAt).getTime())}
          </Text>
          <Box marginTop="m">
            <KButton
              label="Cancel reminder"
              variant="secondary"
              loading={cancelling}
              onPress={() => onCancel(active.id)}
            />
          </Box>
        </Surface>
      ) : (
        <KEmpty
          icon="timer"
          title="No reminder running"
          message="Pick a machine and we'll count down your cycle, so you know exactly when to collect your laundry."
          action={<KButton label="Pick a machine" onPress={onPickMachine} />}
        />
      )}

      <Box>
        <Text variant="heading" marginBottom="m">
          History
        </Text>
        {history.length === 0 ? (
          <KEmpty
            icon="history"
            title="No past reminders"
            message="Every reminder you set shows up here once it finishes."
            action={<KButton label="Set your first reminder" variant="secondary" onPress={onPickMachine} />}
          />
        ) : (
          <Box gap="s">
            {history.map((r) => {
              const isActive = !r.endedAt && new Date(r.endsAt).getTime() > nowMs
              return (
                <Surface key={r.id}>
                  <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
                    <Text variant="bodyStrong" flex={1} numberOfLines={1}>
                      {r.machineName}
                    </Text>
                    <Text
                      variant="caption"
                      style={{
                        fontWeight: "600",
                        color: isActive ? theme.colors.warningInk : theme.colors.ink500,
                      }}
                    >
                      {outcomeLabel(r, nowMs)}
                    </Text>
                  </Box>
                  <Text variant="caption" marginTop="xs">
                    {formatClock(new Date(r.startedAt).getTime())} –{" "}
                    {formatClock(new Date(r.endsAt).getTime())} · {r.durationMinutes} min
                  </Text>
                </Surface>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}

function SetReminderSheet({
  machine,
  duration,
  customOpen,
  customValue,
  customError,
  endsAtMs,
  submitting,
  onClose,
  onPickDuration,
  onToggleCustom,
  onChangeCustom,
  onApplyCustom,
  onStart,
}: {
  machine: LaundryMachineView | null
  duration: number
  customOpen: boolean
  customValue: string
  customError: string | null
  endsAtMs: number
  submitting: boolean
  onClose: () => void
  onPickDuration: (d: number) => void
  onToggleCustom: (open: boolean) => void
  onChangeCustom: (v: string) => void
  onApplyCustom: () => void
  onStart: () => void
}) {
  return (
    <Sheet
      visible={Boolean(machine)}
      onClose={onClose}
      title="Set Laundry Reminder"
      subtitle={machine ? machine.name : undefined}
      footer={<KButton label="Start Reminder" loading={submitting} onPress={onStart} />}
    >
      {machine ? (
        <Box gap="l" paddingTop="s">
          <Box>
            <Text variant="label" marginBottom="xs">
              SELECTED MACHINE
            </Text>
            <Text variant="bodyStrong">{machine.name}</Text>
          </Box>

          <Box>
            <Text variant="label" marginBottom="s">
              CYCLE DURATION
            </Text>
            <PillRail>
              {LAUNDRY_DURATIONS.map((d) => (
                <KPill
                  key={d}
                  label={`${d} min`}
                  selected={!customOpen && duration === d}
                  onPress={() => onPickDuration(d)}
                />
              ))}
              <KPill
                label="Custom"
                icon="tune"
                selected={customOpen}
                onPress={() => onToggleCustom(!customOpen)}
              />
            </PillRail>
            {customOpen ? (
              <Box flexDirection="row" alignItems="flex-start" gap="s" marginTop="m">
                <Box flex={1}>
                  <TextField
                    label={`Minutes (${LAUNDRY_MIN_MINUTES}–${LAUNDRY_MAX_MINUTES})`}
                    value={customValue}
                    onChangeText={onChangeCustom}
                    keyboardType="numeric"
                    error={customError}
                  />
                </Box>
                <Box marginTop="l">
                  <KButton label="Set" variant="secondary" fullWidth={false} onPress={onApplyCustom} />
                </Box>
              </Box>
            ) : null}
          </Box>

          <Box>
            <Text variant="label">ESTIMATED END TIME</Text>
            <Text variant="title" marginTop="xs">
              {formatClock(endsAtMs)}
            </Text>
            <Text variant="caption">Your laundry should be ready at {formatClock(endsAtMs)}.</Text>
          </Box>
        </Box>
      ) : null}
    </Sheet>
  )
}

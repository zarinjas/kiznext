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
import { Modal, Pressable, ScrollView } from "react-native"

import { ApiError } from "@/lib/api"
import { absoluteUrl } from "@/lib/config"
import { useCancelLaundry, useLaundry, useStartLaundry } from "@/lib/hooks"
import {
  Box,
  Icon,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  TextField,
  type ChipTone,
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
  const theme = useTheme()
  const { data, isLoading } = useLaundry()
  const start = useStartLaundry()
  const cancel = useCancelLaundry()

  const [tab, setTab] = useState<"status" | "mine">("status")
  const [selected, setSelected] = useState<LaundryMachineView | null>(null)
  const [duration, setDuration] = useState<number>(LAUNDRY_DEFAULT_DURATION)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState(String(LAUNDRY_DEFAULT_DURATION))
  const [confirmReplace, setConfirmReplace] = useState<LaundryMachineView | null>(null)
  const [notice, setNotice] = useState<{ tone: ChipTone; msg: string } | null>(null)

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

  if (isLoading || !data) return <LoadingScreen label="Loading laundry…" />

  function chooseMachine(m: LaundryMachineView) {
    if (!SELECTABLE.has(m.state)) return
    setSelected(m)
    setCustomOpen(false)
    setDuration(LAUNDRY_DEFAULT_DURATION)
    setNotice(null)
  }

  function applyCustom() {
    const n = Number(customValue)
    if (!Number.isInteger(n) || n < LAUNDRY_MIN_MINUTES || n > LAUNDRY_MAX_MINUTES) {
      setNotice({
        tone: "danger",
        msg: `Enter a whole number between ${LAUNDRY_MIN_MINUTES} and ${LAUNDRY_MAX_MINUTES}.`,
      })
      return
    }
    setDuration(n)
    setCustomOpen(false)
  }

  async function doStart(m: LaundryMachineView) {
    setConfirmReplace(null)
    try {
      await start.mutateAsync({ machineId: m.id, durationMinutes: duration })
      setSelected(null)
      setNotice({ tone: "success", msg: `Reminder set — we'll show the timer for ${m.name}.` })
    } catch (e) {
      setNotice({ tone: "danger", msg: e instanceof ApiError ? e.message : "Couldn't set the reminder." })
    }
  }

  function onStartClick() {
    if (!selected) return
    if (selected.reminder && !selected.reminder.mine) {
      setConfirmReplace(selected)
      return
    }
    void doStart(selected)
  }

  async function cancelMine(reminderId: string) {
    try {
      await cancel.mutateAsync(reminderId)
      setNotice({ tone: "success", msg: "Reminder cancelled." })
    } catch (e) {
      setNotice({ tone: "danger", msg: e instanceof ApiError ? e.message : "Couldn't cancel." })
    }
  }

  const endsAtMs = nowMs + duration * 60_000

  return (
    <Screen scroll edges={[]}>
      <Box flexDirection="row" gap="s" paddingTop="m">
        {(["status", "mine"] as const).map((t) => {
          const active = tab === t
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1 }}>
              <Box
                paddingVertical="s"
                borderRadius="pill"
                borderWidth={1}
                borderColor={active ? "brand600" : "border"}
                backgroundColor={active ? "brand50" : "surface"}
                alignItems="center"
              >
                <Text
                  variant="caption"
                  style={{
                    fontWeight: "600",
                    color: active ? theme.colors.brand700 : theme.colors.ink500,
                  }}
                >
                  {t === "status" ? "Machine Status" : "My Reminder"}
                </Text>
              </Box>
            </Pressable>
          )
        })}
      </Box>

      {notice ? (
        <Box marginTop="m">
          <Surface>
            <Text variant="caption" style={{ fontWeight: "600" }}>
              {notice.msg}
            </Text>
          </Surface>
        </Box>
      ) : null}

      {tab === "status" ? (
        <>
          <Text variant="heading" marginTop="l" marginBottom="m">
            Select a Machine
          </Text>

          {data.machines.length === 0 ? (
            <KEmpty
              icon="local_laundry_service"
              title="No machines yet"
              message="The KIZ office hasn't added any laundry machines."
            />
          ) : (
            <Box flexDirection="row" flexWrap="wrap" gap="m">
              {data.machines.map((m) => (
                <MachineCard
                  key={m.id}
                  machine={m}
                  nowMs={nowMs}
                  selected={selected?.id === m.id}
                  defaultImageUrl={data.defaultImageUrl}
                  onSelect={() => chooseMachine(m)}
                />
              ))}
            </Box>
          )}

          <Box marginTop="l">
            <Surface>
              <Text variant="bodyStrong">Reminder-based status</Text>
              <Text variant="caption" marginTop="xs">
                Machine activity is based on reminders set by residents and may not reflect actual
                availability.
              </Text>
            </Surface>
          </Box>
        </>
      ) : (
        <MyReminderTab
          active={data.myActive}
          history={data.myHistory}
          nowMs={nowMs}
          cancelling={cancel.isPending}
          onCancel={cancelMine}
        />
      )}

      <Box height={32} />

      <SetReminderSheet
        machine={selected}
        duration={duration}
        customOpen={customOpen}
        customValue={customValue}
        endsAtMs={endsAtMs}
        submitting={start.isPending}
        onClose={() => setSelected(null)}
        onPickDuration={(d) => {
          setDuration(d)
          setCustomOpen(false)
        }}
        onToggleCustom={(open) => {
          setCustomOpen(open)
          setCustomValue(String(duration))
        }}
        onChangeCustom={setCustomValue}
        onApplyCustom={applyCustom}
        onStart={onStartClick}
      />

      <Modal
        visible={Boolean(confirmReplace)}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmReplace(null)}
      >
        <Box flex={1} backgroundColor="transparent" alignItems="center" justifyContent="center" padding="l">
          <Surface>
            <Text variant="heading">Replace the active reminder?</Text>
            <Text variant="body" marginTop="s">
              {confirmReplace?.name} is currently in use by{" "}
              {confirmReplace?.reminder?.userName ?? "another resident"}. Starting your reminder will
              replace their timer.
            </Text>
            <Box flexDirection="row" gap="m" marginTop="l">
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
          </Surface>
        </Box>
      </Modal>
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
    <Pressable onPress={selectable ? onSelect : undefined} style={{ width: "47%" }}>
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
    </Pressable>
  )
}

function MyReminderTab({
  active,
  history,
  nowMs,
  cancelling,
  onCancel,
}: {
  active: LaundryReminderView | null
  history: LaundryReminderView[]
  nowMs: number
  cancelling: boolean
  onCancel: (id: string) => void
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
        <Surface>
          <Text variant="body">
            You have no active reminder. Set one from the Machine Status tab.
          </Text>
        </Surface>
      )}

      <Box>
        <Text variant="heading" marginBottom="m">
          History
        </Text>
        {history.length === 0 ? (
          <KEmpty
            icon="history"
            title="Nothing here yet"
            message="Your past laundry reminders will show up here."
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
  endsAtMs: number
  submitting: boolean
  onClose: () => void
  onPickDuration: (d: number) => void
  onToggleCustom: (open: boolean) => void
  onChangeCustom: (v: string) => void
  onApplyCustom: () => void
  onStart: () => void
}) {
  const theme = useTheme()
  return (
    <Modal visible={Boolean(machine)} animationType="slide" transparent onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <Box
          backgroundColor="surface"
          borderTopLeftRadius="sheet"
          borderTopRightRadius="sheet"
          maxHeight="92%"
        >
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text variant="heading">Set Laundry Reminder</Text>
              <Pressable onPress={onClose}>
                <Text variant="caption">Close</Text>
              </Pressable>
            </Box>

            {machine ? (
              <Box gap="l" marginTop="l">
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
                  <Box flexDirection="row" flexWrap="wrap" gap="s">
                    {LAUNDRY_DURATIONS.map((d) => {
                      const active = !customOpen && duration === d
                      return (
                        <Pressable key={d} onPress={() => onPickDuration(d)}>
                          <Box
                            paddingHorizontal="l"
                            paddingVertical="s"
                            borderRadius="pill"
                            borderWidth={1}
                            borderColor={active ? "brand600" : "border"}
                            backgroundColor={active ? "brand50" : "surface"}
                          >
                            <Text
                              variant="caption"
                              style={{
                                fontWeight: "600",
                                color: active ? theme.colors.brand700 : theme.colors.ink700,
                              }}
                            >
                              {d} min
                            </Text>
                          </Box>
                        </Pressable>
                      )
                    })}
                    <Pressable onPress={() => onToggleCustom(!customOpen)}>
                      <Box
                        paddingHorizontal="l"
                        paddingVertical="s"
                        borderRadius="pill"
                        borderWidth={1}
                        borderColor={customOpen ? "brand600" : "border"}
                        backgroundColor={customOpen ? "brand50" : "surface"}
                      >
                        <Text
                          variant="caption"
                          style={{
                            fontWeight: "600",
                            color: customOpen ? theme.colors.brand700 : theme.colors.ink700,
                          }}
                        >
                          Custom
                        </Text>
                      </Box>
                    </Pressable>
                  </Box>
                  {customOpen ? (
                    <Box flexDirection="row" alignItems="flex-end" gap="s" marginTop="m">
                      <Box flex={1}>
                        <TextField
                          label={`Minutes (${LAUNDRY_MIN_MINUTES}–${LAUNDRY_MAX_MINUTES})`}
                          value={customValue}
                          onChangeText={onChangeCustom}
                          keyboardType="numeric"
                        />
                      </Box>
                      <KButton label="Set" variant="secondary" fullWidth={false} onPress={onApplyCustom} />
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

                <KButton label="Start Reminder" loading={submitting} onPress={onStart} />
                <Pressable onPress={onClose} style={{ alignSelf: "center" }}>
                  <Text variant="caption" style={{ color: theme.colors.ink500 }}>
                    Cancel
                  </Text>
                </Pressable>
              </Box>
            ) : null}
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  )
}

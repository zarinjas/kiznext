import { useTheme } from "@shopify/restyle"
import { useState } from "react"
import { Modal, Pressable, ScrollView } from "react-native"

import { ApiError } from "@/lib/api"
import { useBookGuestHouse, useGuestHouses } from "@/lib/hooks"
import type { GuestHouse } from "@/lib/types"
import {
  Box,
  DateField,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  TextField,
} from "@/ui"

const PERIODS = ["daily", "weekly", "monthly"] as const

function parseDateSafe(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function rangeLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
    }).format(new Date(iso))
  return `${fmt(startIso)} – ${fmt(endIso)}`
}

export default function GuestHouseScreen() {
  const theme = useTheme()
  const { data, isLoading } = useGuestHouses()
  const book = useBookGuestHouse()

  const [selected, setSelected] = useState<GuestHouse | null>(null)
  const [guestName, setGuestName] = useState("")
  const [periodType, setPeriodType] = useState<(typeof PERIODS)[number]>("daily")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (isLoading || !data) return <LoadingScreen label="Loading guest houses…" />

  function reset() {
    setSelected(null)
    setGuestName("")
    setPeriodType("daily")
    setStartDate("")
    setEndDate("")
    setNotes("")
    setError(null)
  }

  function submit() {
    if (!selected) return
    setError(null)
    if (!guestName.trim() || !startDate || !endDate) {
      setError("Fill in the guest name and both dates.")
      return
    }
    book.mutate(
      {
        guestHouseId: selected.id,
        guestName: guestName.trim(),
        periodType,
        startDate,
        endDate,
        notes,
      },
      {
        onSuccess: () => {
          setDone(true)
          reset()
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't create the booking."),
      }
    )
  }

  return (
    <Screen scroll edges={[]}>
      {done ? (
        <Box
          marginTop="m"
          borderRadius="input"
          borderWidth={1}
          borderColor="success"
          backgroundColor="successSoft"
          padding="m"
        >
          <Text variant="caption" style={{ color: theme.colors.successInk }}>
            Booking sent — the KIZ office will review it.
          </Text>
        </Box>
      ) : null}

      {data.guestHouses.length === 0 ? (
        <KEmpty icon="hotel" title="No guest houses yet" />
      ) : (
        <Box marginTop="l" gap="m">
          {data.guestHouses.map((h) => {
            const ranges = data.activeBookings.filter((b) => b.guestHouseId === h.id)
            return (
              <Surface key={h.id}>
                <Text variant="subheading">{h.name}</Text>
                <Text variant="caption" marginTop="xs" numberOfLines={3}>
                  {h.description}
                </Text>
                <Text variant="caption" marginTop="s">
                  {[
                    h.price != null ? `RM ${h.price.toFixed(2)} / night` : "Price on request",
                    h.capacity ? `${h.capacity} pax` : null,
                    h.maxDays ? `Max ${h.maxDays} days` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>

                {ranges.length > 0 ? (
                  <Box marginTop="m" gap="xs">
                    <Text variant="label">BOOKED</Text>
                    {ranges.slice(0, 4).map((r) => (
                      <Text key={r.id} variant="caption">
                        {rangeLabel(r.startDate, r.endDate)}
                      </Text>
                    ))}
                  </Box>
                ) : (
                  <Box marginTop="m">
                    <StatusChip label="Fully available" tone="success" />
                  </Box>
                )}

                <Box marginTop="m">
                  <KButton label="Book a stay" icon="hotel" onPress={() => setSelected(h)} />
                </Box>
              </Surface>
            )
          })}
        </Box>
      )}
      <Box height={32} />

      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={reset}>
        <Box flex={1} justifyContent="flex-end">
          <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" maxHeight="90%">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                <Text variant="heading">{selected?.name}</Text>
                <Pressable onPress={reset}>
                  <Text variant="caption">Close</Text>
                </Pressable>
              </Box>

              <Box gap="l" marginTop="l">
                <TextField
                  label="Guest name"
                  value={guestName}
                  onChangeText={setGuestName}
                  autoCapitalize="words"
                />
                <Box>
                  <Text variant="label" marginBottom="s" marginLeft="xs">
                    PERIOD
                  </Text>
                  <Box flexDirection="row" gap="s">
                    {PERIODS.map((p) => {
                      const active = p === periodType
                      return (
                        <Pressable key={p} onPress={() => setPeriodType(p)}>
                          <Box
                            paddingHorizontal="m"
                            paddingVertical="s"
                            borderRadius="pill"
                            borderWidth={1}
                            borderColor={active ? "brand600" : "border"}
                            backgroundColor={active ? "brand50" : "surface"}
                          >
                            <Text
                              variant="caption"
                              style={{
                                color: active ? theme.colors.brand700 : theme.colors.ink500,
                                textTransform: "capitalize",
                              }}
                            >
                              {p}
                            </Text>
                          </Box>
                        </Pressable>
                      )
                    })}
                  </Box>
                </Box>
                <DateField
                  label="Start date"
                  value={startDate}
                  onChange={setStartDate}
                  minimumDate={new Date()}
                />
                <DateField
                  label="End date"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={parseDateSafe(startDate)}
                />
                <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} autoCapitalize="sentences" />
              </Box>

              {error ? (
                <Text variant="caption" marginTop="m" style={{ color: theme.colors.dangerInk }}>
                  {error}
                </Text>
              ) : null}

              <Box marginTop="l">
                <KButton label="Send booking" onPress={submit} loading={book.isPending} />
              </Box>
            </ScrollView>
          </Box>
        </Box>
      </Modal>
    </Screen>
  )
}

import { useTheme } from "@shopify/restyle"
import { useState } from "react"
import { Modal, Pressable, ScrollView } from "react-native"

import { ApiError } from "@/lib/api"
import { useBookFacility, useFacilities } from "@/lib/hooks"
import type { Facility } from "@/lib/types"
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
  TimeField,
} from "@/ui"

const PURPOSES = ["Meeting", "Program", "Recreation", "Study/Group", "Other"]

function FacilityCard({ facility, onBook }: { facility: Facility; onBook: () => void }) {
  const canBook = facility.bookable && facility.status === "open"
  return (
    <Surface>
      <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
        <StatusChip
          label={facility.status === "open" ? "Open" : "Coming soon"}
          tone={facility.status === "open" ? "success" : "warning"}
        />
        <Text variant="caption">{facility.categoryName}</Text>
      </Box>
      <Text variant="subheading" marginTop="s">
        {facility.name}
      </Text>
      <Text variant="caption" marginTop="xs" numberOfLines={2}>
        {facility.description}
      </Text>
      <Text variant="caption" marginTop="s">
        {[
          facility.blockName,
          facility.capacity ? `${facility.capacity} pax` : null,
          facility.price != null ? `RM ${facility.price.toFixed(2)}` : "Free",
        ]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      {canBook ? (
        <Box marginTop="m">
          <KButton label="Book this space" icon="event_available" onPress={onBook} />
        </Box>
      ) : (
        <Text variant="caption" marginTop="m">
          {facility.bookable
            ? "Not open for booking yet."
            : "Shared facility — no advance booking needed."}
        </Text>
      )}
    </Surface>
  )
}

export default function FacilitiesScreen() {
  const theme = useTheme()
  const { data, isLoading } = useFacilities()
  const book = useBookFacility()

  const [selected, setSelected] = useState<Facility | null>(null)
  const [date, setDate] = useState("")
  const [timeStart, setTimeStart] = useState("")
  const [timeEnd, setTimeEnd] = useState("")
  const [purpose, setPurpose] = useState("Meeting")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  if (isLoading || !data) return <LoadingScreen label="Loading facilities…" />

  const bookable = data.facilities.filter((f) => f.section === "bookable")
  const shared = data.facilities.filter((f) => f.section === "shared")

  function reset() {
    setSelected(null)
    setDate("")
    setTimeStart("")
    setTimeEnd("")
    setPurpose("Meeting")
    setNotes("")
    setError(null)
  }

  function submit() {
    if (!selected) return
    setError(null)
    if (!date || !timeStart || !timeEnd) {
      setError("Fill in the date and both times.")
      return
    }
    book.mutate(
      { facilityId: selected.id, date, timeStart, timeEnd, purpose, notes },
      {
        onSuccess: (res) => {
          setDone(res.bookingRef)
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
            Booking sent — reference {done}. The KIZ office will review it.
          </Text>
        </Box>
      ) : null}

      {data.facilities.length === 0 ? (
        <KEmpty icon="meeting_room" title="No facilities yet" />
      ) : (
        <>
          {bookable.length > 0 ? (
            <Box marginTop="l" gap="m">
              <Text variant="label" marginLeft="xs">
                BOOKABLE FACILITIES
              </Text>
              {bookable.map((f) => (
                <FacilityCard key={f.id} facility={f} onBook={() => setSelected(f)} />
              ))}
            </Box>
          ) : null}

          {shared.length > 0 ? (
            <Box marginTop="l" gap="m">
              <Text variant="label" marginLeft="xs">
                SHARED FACILITIES
              </Text>
              {shared.map((f) => (
                <FacilityCard key={f.id} facility={f} onBook={() => setSelected(f)} />
              ))}
            </Box>
          ) : null}
        </>
      )}
      <Box height={32} />

      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={reset}>
        <Box flex={1} backgroundColor="transparent" justifyContent="flex-end">
          <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" maxHeight="90%">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Box flexDirection="row" alignItems="center" justifyContent="space-between">
                <Text variant="heading">{selected?.name}</Text>
                <Pressable onPress={reset}>
                  <Text variant="caption">Close</Text>
                </Pressable>
              </Box>
              <Text variant="caption" marginTop="xs">
                Book a slot. The office reviews every request.
              </Text>

              <Box gap="l" marginTop="l">
                <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} />
                <TimeField label="Start time" value={timeStart} onChange={setTimeStart} />
                <TimeField label="End time" value={timeEnd} onChange={setTimeEnd} />

                <Box>
                  <Text variant="label" marginBottom="s" marginLeft="xs">
                    PURPOSE
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box flexDirection="row" gap="s">
                      {PURPOSES.map((p) => {
                        const active = p === purpose
                        return (
                          <Pressable key={p} onPress={() => setPurpose(p)}>
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
                                style={{ color: active ? theme.colors.brand700 : theme.colors.ink500 }}
                              >
                                {p}
                              </Text>
                            </Box>
                          </Pressable>
                        )
                      })}
                    </Box>
                  </ScrollView>
                </Box>

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

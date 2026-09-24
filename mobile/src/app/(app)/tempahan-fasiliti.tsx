import { formatWallClockTime, todayMalaysiaDate } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"

import { ApiError } from "@/lib/api"
import { useBookFacility, useFacilities } from "@/lib/hooks"
import type { Facility } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  CardGrid,
  DateField,
  KButton,
  KEmpty,
  KPill,
  PillRail,
  Screen,
  Sheet,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  TextField,
  TimeField,
  useToast,
} from "@/ui"

/**
 * Local to this screen on purpose — the API accepts a free-text `purpose`, so
 * this list is presentation only and is not validated server-side.
 */
const PURPOSES = ["Meeting", "Program", "Recreation", "Study/Group", "Other"]

/** Minimum bookable slot, in minutes. Mirrors what the office will accept. */
const MIN_DURATION_MINUTES = 30

/** Minutes since midnight for an `HH:MM` wall-clock string, or null if unparseable. */
function hhmmToMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** "45 min" / "1h" / "1h 30m" */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

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
  const { data, isLoading, isError, refetch } = useFacilities()
  const book = useBookFacility()
  const toast = useToast()

  const [section, setSection] = useState<"bookable" | "shared">("bookable")
  const [selected, setSelected] = useState<Facility | null>(null)
  const [date, setDate] = useState("")
  const [timeStart, setTimeStart] = useState("")
  const [timeEnd, setTimeEnd] = useState("")
  const [purpose, setPurpose] = useState("Meeting")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [timeError, setTimeError] = useState<string | null>(null)

  function reset() {
    setSelected(null)
    setDate("")
    setTimeStart("")
    setTimeEnd("")
    setPurpose("Meeting")
    setNotes("")
    setError(null)
    setTimeError(null)
  }

  const startMinutes = hhmmToMinutes(timeStart)
  const endMinutes = hhmmToMinutes(timeEnd)
  const durationMinutes =
    startMinutes != null && endMinutes != null ? endMinutes - startMinutes : null

  /**
   * Client-side guard only — the API applies the same rule (plus the clash and
   * `maxPerDay` checks), this just stops an obviously invalid round trip such as
   * 17:00 → 09:00, which previously passed the presence-only check.
   */
  function validateTimes(): string | null {
    if (durationMinutes == null) return null
    if (durationMinutes <= 0) return "End time must be after the start time."
    if (durationMinutes < MIN_DURATION_MINUTES) return "Bookings must be at least 30 minutes."
    return null
  }

  function submit() {
    if (!selected) return
    setError(null)
    setTimeError(null)
    if (!date || !timeStart || !timeEnd) {
      setError("Fill in the date and both times.")
      return
    }
    const invalid = validateTimes()
    if (invalid) {
      setTimeError(invalid)
      return
    }
    book.mutate(
      { facilityId: selected.id, date, timeStart, timeEnd, purpose, notes },
      {
        onSuccess: () => {
          reset()
          toast.success("Booking request sent — the office will review it.")
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't create the booking."),
      }
    )
  }

  // Live inline feedback once both times are picked, before the user submits.
  const liveTimeError = timeError ?? validateTimes()

  return (
    <Screen scroll edges={[]}>
      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.Grid count={4} />}
        errorTitle="Couldn't load facilities"
        errorMessage="We couldn't reach the facility list. Check your connection and try again."
      >
        {(snapshot) => {
          const bookable = snapshot.facilities.filter((f) => f.section === "bookable")
          const shared = snapshot.facilities.filter((f) => f.section === "shared")
          const visible = section === "bookable" ? bookable : shared

          if (snapshot.facilities.length === 0) {
            return (
              <KEmpty
                icon="meeting_room"
                title="No facilities yet"
                message="The KIZ office hasn't published any bookable spaces. Check back soon."
                action={<KButton label="View my bookings" variant="secondary" onPress={() => router.push("/tempahan")} />}
              />
            )
          }

          return (
            <>
              <Box
                marginTop="m"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                gap="s"
                flexWrap="wrap"
              >
                <PillRail>
                  <KPill
                    label={`Bookable (${bookable.length})`}
                    icon="event_available"
                    selected={section === "bookable"}
                    onPress={() => setSection("bookable")}
                  />
                  <KPill
                    label={`Shared (${shared.length})`}
                    icon="groups"
                    selected={section === "shared"}
                    onPress={() => setSection("shared")}
                  />
                </PillRail>
                {/* Replaces the old permanent `done` banner: the confirmation is
                    now a toast, and this is the lasting way to follow it up. */}
                <KButton
                  label="View my bookings"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  icon="receipt_long"
                  onPress={() => router.push("/tempahan")}
                />
              </Box>

              <Box marginTop="l" gap="m">
                <Text variant="label" marginLeft="xs">
                  {section === "bookable" ? "BOOKABLE FACILITIES" : "SHARED FACILITIES"}
                </Text>
                {visible.length === 0 ? (
                  <KEmpty
                    icon="meeting_room"
                    title={section === "bookable" ? "Nothing bookable yet" : "No shared facilities"}
                    message={
                      section === "bookable"
                        ? "No spaces are open for advance booking right now."
                        : "Shared spaces you can walk into will be listed here."
                    }
                  />
                ) : (
                  <CardGrid
                    items={visible}
                    phoneColumns={1}
                    keyExtractor={(f) => f.id}
                    renderItem={(f) => <FacilityCard facility={f} onBook={() => setSelected(f)} />}
                  />
                )}
              </Box>
            </>
          )
        }}
      </AsyncBoundary>
      <Box height={32} />

      <Sheet
        visible={Boolean(selected)}
        onClose={reset}
        title={selected?.name ?? "Book a facility"}
        subtitle="Book a slot. The office reviews every request."
        footer={<KButton label="Send booking" onPress={submit} loading={book.isPending} />}
      >
        <Box gap="l" paddingTop="s">
          <DateField
            label="Date"
            value={date}
            onChange={setDate}
            minimumDate={todayMalaysiaDate()}
          />
          <TimeField
            label="Start time"
            value={timeStart}
            onChange={(v) => {
              setTimeStart(v)
              setTimeError(null)
            }}
          />
          <TimeField
            label="End time"
            value={timeEnd}
            onChange={(v) => {
              setTimeEnd(v)
              setTimeError(null)
            }}
            error={liveTimeError}
          />

          {durationMinutes != null && !liveTimeError ? (
            <Text variant="caption" marginTop="xs" marginLeft="xs">
              {formatWallClockTime(timeStart)} – {formatWallClockTime(timeEnd)} ·{" "}
              {formatDuration(durationMinutes)}
            </Text>
          ) : null}

          <Box>
            <Text variant="label" marginBottom="s" marginLeft="xs">
              PURPOSE
            </Text>
            <PillRail>
              {PURPOSES.map((p) => (
                <KPill key={p} label={p} selected={p === purpose} onPress={() => setPurpose(p)} />
              ))}
            </PillRail>
          </Box>

          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            autoCapitalize="sentences"
          />

          {error ? (
            <Box
              borderRadius="input"
              borderWidth={1}
              borderColor="danger"
              backgroundColor="dangerSoft"
              padding="m"
            >
              <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                {error}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Sheet>
    </Screen>
  )
}

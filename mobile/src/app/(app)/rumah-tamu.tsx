import { todayMalaysiaDate, wallClockDate, wallClockNights } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"

import { ApiError } from "@/lib/api"
import { useBookGuestHouse, useGuestHouses } from "@/lib/hooks"
import type { GHAvailability, GuestHouse } from "@/lib/types"
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
  useToast,
} from "@/ui"

const PERIODS = ["daily", "weekly", "monthly"] as const

function rangeLabel(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
    }).format(new Date(iso))
  return `${fmt(startIso)} – ${fmt(endIso)}`
}

/**
 * `activeBookings` carries full ISO timestamps; comparison is done on the
 * `YYYY-MM-DD` day part, which sorts correctly lexicographically.
 */
function dayPart(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Half-open overlap test — `[startA, endA)` vs `[startB, endB)`. Matches the
 * server's clash rule (`startDate < end && endDate > start`), so a checkout day
 * and the next guest's check-in day on the same date is not a clash.
 */
function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB
}

export default function GuestHouseScreen() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = useGuestHouses()
  const book = useBookGuestHouse()
  const toast = useToast()

  const [selected, setSelected] = useState<GuestHouse | null>(null)
  const [guestName, setGuestName] = useState("")
  const [periodType, setPeriodType] = useState<(typeof PERIODS)[number]>("daily")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)

  function reset() {
    setSelected(null)
    setGuestName("")
    setPeriodType("daily")
    setStartDate("")
    setEndDate("")
    setNotes("")
    setError(null)
    setDateError(null)
  }

  // Booked ranges for the house currently open in the sheet.
  const selectedRanges: GHAvailability[] = selected
    ? (data?.activeBookings ?? []).filter((b) => b.guestHouseId === selected.id)
    : []

  const nights = startDate && endDate ? wallClockNights(startDate, endDate) : null
  const priceTotal =
    nights != null && nights > 0 && selected?.price != null ? nights * selected.price : null

  /**
   * Client-side guard only. The server re-runs the clash check authoritatively;
   * this stops the user requesting a range that the visible calendar already
   * shows as taken.
   */
  function validateDates(): string | null {
    if (!startDate || !endDate) return null
    if (nights == null) return "Those dates don't look right."
    if (nights <= 0) return "End date must be after the start date."
    if (selected?.maxDays && nights > selected.maxDays) {
      return `Maximum stay is ${selected.maxDays} day${selected.maxDays === 1 ? "" : "s"}.`
    }
    const clash = selectedRanges.some((r) =>
      overlaps(startDate, endDate, dayPart(r.startDate), dayPart(r.endDate))
    )
    if (clash) return "Those dates overlap an existing booking."
    return null
  }

  function submit() {
    if (!selected) return
    setError(null)
    setDateError(null)
    if (!guestName.trim() || !startDate || !endDate) {
      setError("Fill in the guest name and both dates.")
      return
    }
    const invalid = validateDates()
    if (invalid) {
      setDateError(invalid)
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
          reset()
          toast.success("Booking request sent — the office will review it.")
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : "Couldn't create the booking."),
      }
    )
  }

  // Live inline feedback as soon as both dates are picked.
  const liveDateError = dateError ?? validateDates()

  return (
    <Screen scroll edges={[]}>
      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.CardList count={3} />}
        errorTitle="Couldn't load guest houses"
        errorMessage="We couldn't reach the guest house list. Check your connection and try again."
      >
        {(snapshot) => {
          if (snapshot.guestHouses.length === 0) {
            return (
              <KEmpty
                icon="hotel"
                title="No guest houses yet"
                message="The KIZ office hasn't published any guest houses. Check back soon."
                action={
                  <KButton
                    label="View my bookings"
                    variant="secondary"
                    onPress={() => router.push("/tempahan")}
                  />
                }
              />
            )
          }

          return (
            <>
              <Box
                marginTop="m"
                flexDirection="row"
                alignItems="center"
                justifyContent="flex-end"
              >
                {/* Replaces the old permanent `done` banner — the confirmation
                    is a toast now, this is the lasting follow-up. */}
                <KButton
                  label="View my bookings"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  icon="receipt_long"
                  onPress={() => router.push("/tempahan")}
                />
              </Box>

              <Box marginTop="s">
                <CardGrid
                  items={snapshot.guestHouses}
                  phoneColumns={1}
                  keyExtractor={(h) => h.id}
                  renderItem={(h) => {
                    const ranges = snapshot.activeBookings.filter((b) => b.guestHouseId === h.id)
                    return (
                      <Surface>
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
                            <Text variant="label">
                              BOOKED · {ranges.length} {ranges.length === 1 ? "RANGE" : "RANGES"}
                            </Text>
                            {/* Every range is listed: truncating to 4 hid dates
                                that would fail the clash check on submit. */}
                            {ranges.map((r) => (
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
                  }}
                />
              </Box>
            </>
          )
        }}
      </AsyncBoundary>
      <Box height={32} />

      <Sheet
        visible={Boolean(selected)}
        onClose={reset}
        title={selected?.name ?? "Book a stay"}
        subtitle={
          selected?.price != null ? `RM ${selected.price.toFixed(2)} per night` : "Price on request"
        }
        footer={<KButton label="Send booking" onPress={submit} loading={book.isPending} />}
      >
        <Box gap="l" paddingTop="s">
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
            <PillRail>
              {PERIODS.map((p) => (
                <KPill
                  key={p}
                  label={p.charAt(0).toUpperCase() + p.slice(1)}
                  selected={p === periodType}
                  onPress={() => setPeriodType(p)}
                />
              ))}
            </PillRail>
          </Box>

          <DateField
            label="Start date"
            value={startDate}
            onChange={(v) => {
              setStartDate(v)
              setDateError(null)
            }}
            minimumDate={todayMalaysiaDate()}
          />
          <DateField
            label="End date"
            value={endDate}
            onChange={(v) => {
              setEndDate(v)
              setDateError(null)
            }}
            minimumDate={wallClockDate(startDate) ?? todayMalaysiaDate()}
            error={liveDateError}
          />

          {selectedRanges.length > 0 ? (
            <Box gap="xs">
              <Text variant="label" marginLeft="xs">
                ALREADY BOOKED
              </Text>
              {selectedRanges.map((r) => (
                <Text key={r.id} variant="caption" marginLeft="xs">
                  {rangeLabel(r.startDate, r.endDate)}
                </Text>
              ))}
            </Box>
          ) : null}

          {nights != null && nights > 0 && !liveDateError ? (
            <Box
              borderRadius="input"
              borderWidth={1}
              borderColor="border"
              backgroundColor="canvasSunk"
              padding="m"
            >
              <Text variant="bodyStrong">
                {nights} {nights === 1 ? "night" : "nights"}
                {priceTotal != null ? ` · RM ${priceTotal.toFixed(2)}` : ""}
              </Text>
              {priceTotal == null ? (
                <Text variant="caption" marginTop="xs">
                  The office will confirm the rate for this stay.
                </Text>
              ) : null}
            </Box>
          ) : null}

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

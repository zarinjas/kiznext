import { useTheme } from "@shopify/restyle"

import { useCancelFacility, useCancelGuestHouse, useMyBookings } from "@/lib/hooks"
import { Box, KButton, KEmpty, LoadingScreen, Screen, StatusChip, Surface, Text, type ChipTone } from "@/ui"

function bookingTone(status: string): ChipTone {
  switch (status) {
    case "approved":
      return "success"
    case "pending":
      return "warning"
    case "checked_in":
      return "brand"
    case "checked_out":
      return "info"
    case "rejected":
    case "cancelled":
      return "danger"
    default:
      return "neutral"
  }
}

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function whenLabel(startIso: string, endIso?: string): string {
  const fmt = (iso: string, withTime: boolean) =>
    new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(iso))
  return endIso ? `${fmt(startIso, true)} → ${fmt(endIso, true)}` : fmt(startIso, false)
}

export default function MyBookingsScreen() {
  const theme = useTheme()
  const { data, isLoading } = useMyBookings()
  const cancelFacility = useCancelFacility()
  const cancelGH = useCancelGuestHouse()

  if (isLoading || !data) return <LoadingScreen label="Loading your bookings…" />

  const empty = data.facilityBookings.length === 0 && data.guestHouseBookings.length === 0

  return (
    <Screen scroll edges={[]}>
      {empty ? (
        <KEmpty
          icon="calendar_month"
          title="No bookings yet"
          message="Book a facility or a guest house and it'll show up here."
        />
      ) : (
        <>
          {data.facilityBookings.length > 0 ? (
            <Box marginTop="l" gap="m">
              <Text variant="label" marginLeft="xs">
                FACILITY BOOKINGS
              </Text>
              {data.facilityBookings.map((b) => (
                <Surface key={b.id}>
                  <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
                    <Text variant="bodyStrong" flex={1} numberOfLines={1}>
                      {b.facilityName}
                    </Text>
                    <StatusChip label={statusLabel(b.status)} tone={bookingTone(b.status)} />
                  </Box>
                  <Text variant="caption" marginTop="xs">
                    {whenLabel(b.timeSlotStart, b.timeSlotEnd)}
                  </Text>
                  {b.bookingRef ? (
                    <Text variant="caption" marginTop="xs">
                      Ref {b.bookingRef}
                    </Text>
                  ) : null}
                  {b.status === "pending" ? (
                    <Box marginTop="m">
                      <KButton
                        label="Cancel"
                        variant="secondary"
                        onPress={() => cancelFacility.mutate(b.id)}
                        loading={cancelFacility.isPending}
                      />
                    </Box>
                  ) : null}
                </Surface>
              ))}
            </Box>
          ) : null}

          {data.guestHouseBookings.length > 0 ? (
            <Box marginTop="l" gap="m">
              <Text variant="label" marginLeft="xs">
                GUEST HOUSE BOOKINGS
              </Text>
              {data.guestHouseBookings.map((b) => (
                <Surface key={b.id}>
                  <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
                    <Text variant="bodyStrong" flex={1} numberOfLines={1}>
                      {b.guestHouseName}
                    </Text>
                    <StatusChip label={statusLabel(b.status)} tone={bookingTone(b.status)} />
                  </Box>
                  <Text variant="caption" marginTop="xs">
                    Guest: {b.guestName} · {b.periodType}
                  </Text>
                  <Text variant="caption" marginTop="xs">
                    {whenLabel(b.startDate, b.endDate)}
                  </Text>
                  <Box flexDirection="row" alignItems="center" gap="s" marginTop="s">
                    <StatusChip
                      label={b.paymentStatus === "paid_manual" ? "Paid" : "Unpaid"}
                      tone={b.paymentStatus === "paid_manual" ? "success" : "neutral"}
                    />
                  </Box>
                  {b.status === "pending" ? (
                    <Box marginTop="m">
                      <KButton
                        label="Cancel"
                        variant="secondary"
                        onPress={() => cancelGH.mutate(b.id)}
                        loading={cancelGH.isPending}
                      />
                    </Box>
                  ) : null}
                </Surface>
              ))}
            </Box>
          ) : null}
        </>
      )}

      <Box height={32} />
      <Text variant="caption" style={{ color: theme.colors.ink300 }} />
    </Screen>
  )
}

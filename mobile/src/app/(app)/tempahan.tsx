import { router } from "expo-router"
import { Alert } from "react-native"

import { useCancelFacility, useCancelGuestHouse, useMyBookings } from "@/lib/hooks"
import {
  Box,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  useToast,
  type ChipTone,
} from "@/ui"

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

function confirmCancel(label: string, run: () => void) {
  Alert.alert("Cancel this booking?", `${label} will be released. This can't be undone.`, [
    { text: "Keep booking", style: "cancel" },
    { text: "Cancel booking", style: "destructive", onPress: run },
  ])
}

export default function MyBookingsScreen() {
  const { data, isLoading, refetch } = useMyBookings()
  const cancelFacility = useCancelFacility()
  const cancelGH = useCancelGuestHouse()
  const toast = useToast()

  if (isLoading) return <LoadingScreen label="Loading your bookings…" />

  if (!data) {
    return (
      <Screen scroll edges={[]}>
        <KEmpty
          tone="danger"
          icon="error_outline"
          title="Couldn't load your bookings"
          message="Check your connection and try again."
          action={<KButton label="Try again" icon="refresh" onPress={() => refetch()} />}
        />
      </Screen>
    )
  }

  const empty = data.facilityBookings.length === 0 && data.guestHouseBookings.length === 0

  return (
    <Screen scroll edges={[]}>
      {empty ? (
        <KEmpty
          icon="calendar_month"
          title="No bookings yet"
          message="Book a facility or a guest house and it'll show up here."
          action={
            <>
              <KButton
                label="Book a facility"
                icon="meeting_room"
                onPress={() => router.push("/tempahan-fasiliti")}
              />
              <KButton
                label="Book a guest house"
                icon="hotel"
                variant="secondary"
                onPress={() => router.push("/rumah-tamu")}
              />
            </>
          }
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
                        onPress={() =>
                          confirmCancel(b.facilityName, () =>
                            cancelFacility.mutate(b.id, {
                              onSuccess: () => toast.success("Booking cancelled."),
                              onError: () => toast.error("Couldn't cancel. Try again."),
                            })
                          )
                        }
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
                        onPress={() =>
                          confirmCancel(b.guestHouseName, () =>
                            cancelGH.mutate(b.id, {
                              onSuccess: () => toast.success("Booking cancelled."),
                              onError: () => toast.error("Couldn't cancel. Try again."),
                            })
                          )
                        }
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
    </Screen>
  )
}

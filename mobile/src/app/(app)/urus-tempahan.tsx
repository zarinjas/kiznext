import { useState } from "react"
import { Alert } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { useAdminBookings, useAdminFacilityAction, useAdminGHAction } from "@/lib/hooks"
import {
  AsyncBoundary,
  Box,
  KButton,
  KEmpty,
  KPill,
  PillRail,
  Screen,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  useToast,
  type ChipTone,
} from "@/ui"

function statusTone(status: string): ChipTone {
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

function label(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function slotLabel(startIso: string, endIso?: string): string {
  const fmt = (iso: string, time: boolean) =>
    new Intl.DateTimeFormat("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      day: "numeric",
      month: "short",
      ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(iso))
  return endIso ? `${fmt(startIso, true)} → ${fmt(endIso, true)}` : fmt(startIso, false)
}

export default function AdminBookingsScreen() {
  const { user } = useAuth()
  const canAct = user?.role === "superadmin" || user?.role === "admin_kiz"
  const [status, setStatus] = useState<"pending" | "all">("pending")
  const [tab, setTab] = useState<"facility" | "guest">("facility")
  const { data, isLoading, isError, refetch, isRefetching } = useAdminBookings(status)
  const facilityAction = useAdminFacilityAction()
  const ghAction = useAdminGHAction()
  const toast = useToast()

  function runFacility(id: string, action: "approve" | "reject") {
    facilityAction.mutate(
      { id, action },
      {
        onSuccess: () =>
          toast.success(action === "approve" ? "Booking approved." : "Booking rejected."),
        onError: () => toast.error("Couldn't update the booking. Try again."),
      }
    )
  }

  function runGH(id: string, action: "approve" | "reject" | "check_in" | "check_out" | "mark_paid") {
    const done: Record<typeof action, string> = {
      approve: "Booking approved.",
      reject: "Booking rejected.",
      check_in: "Guest checked in.",
      check_out: "Guest checked out.",
      mark_paid: "Marked as paid.",
    }
    ghAction.mutate(
      { id, action },
      {
        onSuccess: () => toast.success(done[action]),
        onError: () => toast.error("Couldn't update the booking. Try again."),
      }
    )
  }

  /** Rejection is destructive and was firing on the first tap — confirm first. */
  function confirmReject(onConfirm: () => void) {
    Alert.alert("Reject this booking?", "The resident will be notified that it was rejected.", [
      { text: "Keep pending", style: "cancel" },
      { text: "Reject", style: "destructive", onPress: onConfirm },
    ])
  }

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      {/* Filters stay mounted during load so the header doesn't disappear. */}
      <Box marginTop="m" gap="s">
        <PillRail>
          {(["pending", "all"] as const).map((s) => (
            <KPill
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={s === status}
              onPress={() => setStatus(s)}
            />
          ))}
        </PillRail>

        <PillRail>
          <KPill
            label="Facility"
            icon="meeting_room"
            selected={tab === "facility"}
            onPress={() => setTab("facility")}
          />
          <KPill
            label="Guest house"
            icon="hotel"
            selected={tab === "guest"}
            onPress={() => setTab("guest")}
          />
        </PillRail>
      </Box>

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.CardList count={3} />}
        errorTitle="Couldn't load approvals"
      >
        {(loaded) =>
          tab === "facility" ? (
            loaded.facilityBookings.length === 0 ? (
              <KEmpty
                icon="task_alt"
                title="No facility requests"
                message="Facility bookings awaiting your action will show up here."
              />
            ) : (
              <Box gap="m" marginTop="l">
                {loaded.facilityBookings.map((b) => (
                  <Surface key={b.id}>
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap="s"
                    >
                      <Text variant="bodyStrong" flex={1} numberOfLines={1}>
                        {b.facilityName}
                      </Text>
                      <StatusChip label={label(b.status)} tone={statusTone(b.status)} />
                    </Box>
                    <Text variant="caption" marginTop="xs">
                      {b.userName} ({b.userMatric})
                    </Text>
                    <Text variant="caption" marginTop="xs">
                      {slotLabel(b.timeSlotStart, b.timeSlotEnd)}
                    </Text>
                    {b.purpose ? (
                      <Text variant="caption" marginTop="xs">
                        {b.purpose}
                      </Text>
                    ) : null}
                    {b.bookingRef ? (
                      <Text variant="caption" marginTop="xs">
                        Ref {b.bookingRef}
                      </Text>
                    ) : null}
                    {canAct && b.status === "pending" ? (
                      <Box flexDirection="row" gap="s" marginTop="m">
                        <Box flex={1}>
                          <KButton
                            label="Approve"
                            onPress={() => runFacility(b.id, "approve")}
                            loading={facilityAction.isPending}
                          />
                        </Box>
                        <Box flex={1}>
                          <KButton
                            label="Reject"
                            variant="secondary"
                            onPress={() => confirmReject(() => runFacility(b.id, "reject"))}
                            loading={facilityAction.isPending}
                          />
                        </Box>
                      </Box>
                    ) : null}
                  </Surface>
                ))}
              </Box>
            )
          ) : loaded.guestHouseBookings.length === 0 ? (
            <KEmpty
              icon="task_alt"
              title="No guest-house requests"
              message="Guest-house bookings awaiting your action will show up here."
            />
          ) : (
            <Box gap="m" marginTop="l">
              {loaded.guestHouseBookings.map((b) => (
                <Surface key={b.id}>
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    gap="s"
                  >
                    <Text variant="bodyStrong" flex={1} numberOfLines={1}>
                      {b.guestHouseName}
                    </Text>
                    <StatusChip label={label(b.status)} tone={statusTone(b.status)} />
                  </Box>
                  <Text variant="caption" marginTop="xs">
                    Guest: {b.guestName} · by {b.userName} ({b.userMatric})
                  </Text>
                  <Text variant="caption" marginTop="xs">
                    {slotLabel(b.startDate, b.endDate)} · {b.periodType}
                  </Text>
                  <Box flexDirection="row" gap="s" marginTop="s">
                    <StatusChip
                      label={b.paymentStatus === "paid_manual" ? "Paid" : "Unpaid"}
                      tone={b.paymentStatus === "paid_manual" ? "success" : "neutral"}
                    />
                  </Box>

                  <Box flexDirection="row" gap="s" marginTop="m" flexWrap="wrap">
                    {canAct && b.status === "pending" ? (
                      <>
                        <Box flex={1} minWidth={120}>
                          <KButton
                            label="Approve"
                            onPress={() => runGH(b.id, "approve")}
                            loading={ghAction.isPending}
                          />
                        </Box>
                        <Box flex={1} minWidth={120}>
                          <KButton
                            label="Reject"
                            variant="secondary"
                            onPress={() => confirmReject(() => runGH(b.id, "reject"))}
                            loading={ghAction.isPending}
                          />
                        </Box>
                      </>
                    ) : null}
                    {canAct && b.status === "approved" ? (
                      <Box flex={1} minWidth={120}>
                        <KButton
                          label="Check in"
                          onPress={() => runGH(b.id, "check_in")}
                          loading={ghAction.isPending}
                        />
                      </Box>
                    ) : null}
                    {canAct && b.status === "checked_in" ? (
                      <Box flex={1} minWidth={120}>
                        <KButton
                          label="Check out"
                          onPress={() => runGH(b.id, "check_out")}
                          loading={ghAction.isPending}
                        />
                      </Box>
                    ) : null}
                    {canAct && b.paymentStatus !== "paid_manual" ? (
                      <Box flex={1} minWidth={120}>
                        <KButton
                          label="Mark paid"
                          variant="secondary"
                          onPress={() => runGH(b.id, "mark_paid")}
                          loading={ghAction.isPending}
                        />
                      </Box>
                    ) : null}
                  </Box>
                </Surface>
              ))}
            </Box>
          )
        }
      </AsyncBoundary>

      <Box height={32} />
    </Screen>
  )
}

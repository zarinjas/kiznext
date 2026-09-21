import { useTheme } from "@shopify/restyle"
import { useState } from "react"
import { Pressable, ScrollView } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { useAdminBookings, useAdminFacilityAction, useAdminGHAction } from "@/lib/hooks"
import {
  Box,
  KButton,
  KEmpty,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
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
  const theme = useTheme()
  const { user } = useAuth()
  const canAct = user?.role === "superadmin" || user?.role === "admin_kiz"
  const [status, setStatus] = useState<"pending" | "all">("pending")
  const [tab, setTab] = useState<"facility" | "guest">("facility")
  const { data, isLoading, refetch, isRefetching } = useAdminBookings(status)
  const facilityAction = useAdminFacilityAction()
  const ghAction = useAdminGHAction()

  if (isLoading || !data) return <LoadingScreen label="Loading approvals…" />

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <Box marginTop="m" gap="s">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box flexDirection="row" gap="s">
            {(["pending", "all"] as const).map((s) => {
              const active = s === status
              return (
                <Pressable key={s} onPress={() => setStatus(s)}>
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
                      style={{ color: active ? theme.colors.brand700 : theme.colors.ink500, textTransform: "capitalize" }}
                    >
                      {s}
                    </Text>
                  </Box>
                </Pressable>
              )
            })}
          </Box>
        </ScrollView>

        <Box flexDirection="row" gap="s">
          <Box flex={1}>
            <KButton
              label="Facility"
              variant={tab === "facility" ? "primary" : "secondary"}
              onPress={() => setTab("facility")}
            />
          </Box>
          <Box flex={1}>
            <KButton
              label="Guest house"
              variant={tab === "guest" ? "primary" : "secondary"}
              onPress={() => setTab("guest")}
            />
          </Box>
        </Box>
      </Box>

      {tab === "facility" ? (
        data.facilityBookings.length === 0 ? (
          <KEmpty icon="task_alt" title="No facility requests" />
        ) : (
          <Box gap="m" marginTop="l">
            {data.facilityBookings.map((b) => (
              <Surface key={b.id}>
                <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
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
                        onPress={() => facilityAction.mutate({ id: b.id, action: "approve" })}
                        loading={facilityAction.isPending}
                      />
                    </Box>
                    <Box flex={1}>
                      <KButton
                        label="Reject"
                        variant="secondary"
                        onPress={() => facilityAction.mutate({ id: b.id, action: "reject" })}
                        loading={facilityAction.isPending}
                      />
                    </Box>
                  </Box>
                ) : null}
              </Surface>
            ))}
          </Box>
        )
      ) : data.guestHouseBookings.length === 0 ? (
        <KEmpty icon="task_alt" title="No guest-house requests" />
      ) : (
        <Box gap="m" marginTop="l">
          {data.guestHouseBookings.map((b) => (
            <Surface key={b.id}>
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" gap="s">
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
                        onPress={() => ghAction.mutate({ id: b.id, action: "approve" })}
                        loading={ghAction.isPending}
                      />
                    </Box>
                    <Box flex={1} minWidth={120}>
                      <KButton
                        label="Reject"
                        variant="secondary"
                        onPress={() => ghAction.mutate({ id: b.id, action: "reject" })}
                        loading={ghAction.isPending}
                      />
                    </Box>
                  </>
                ) : null}
                {canAct && b.status === "approved" ? (
                  <Box flex={1} minWidth={120}>
                    <KButton
                      label="Check in"
                      onPress={() => ghAction.mutate({ id: b.id, action: "check_in" })}
                      loading={ghAction.isPending}
                    />
                  </Box>
                ) : null}
                {canAct && b.status === "checked_in" ? (
                  <Box flex={1} minWidth={120}>
                    <KButton
                      label="Check out"
                      onPress={() => ghAction.mutate({ id: b.id, action: "check_out" })}
                      loading={ghAction.isPending}
                    />
                  </Box>
                ) : null}
                {canAct && b.paymentStatus !== "paid_manual" ? (
                  <Box flex={1} minWidth={120}>
                    <KButton
                      label="Mark paid"
                      variant="secondary"
                      onPress={() => ghAction.mutate({ id: b.id, action: "mark_paid" })}
                      loading={ghAction.isPending}
                    />
                  </Box>
                ) : null}
              </Box>
            </Surface>
          ))}
        </Box>
      )}

      <Box height={32} />
    </Screen>
  )
}

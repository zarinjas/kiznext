import { ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router, type Href } from "expo-router"
import { useState } from "react"
import { Pressable, ScrollView } from "react-native"

import { useAdminHelpdesk } from "@/lib/hooks"
import {
  Box,
  KEmpty,
  ListGroup,
  ListRow,
  LoadingScreen,
  Screen,
  StatusChip,
  Text,
  type ChipTone,
} from "@/ui"

function statusTone(status: string): ChipTone {
  switch (status) {
    case "submitted":
      return "info"
    case "under_review":
    case "more_info_required":
      return "warning"
    case "in_progress":
      return "brand"
    case "resolved":
      return "success"
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

export default function AdminHelpdeskScreen() {
  const theme = useTheme()
  const [status, setStatus] = useState<"open" | "closed" | "all">("open")
  const { data, isLoading, refetch, isRefetching } = useAdminHelpdesk(status)

  if (isLoading || !data) return <LoadingScreen label="Loading inbox…" />

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <Box marginTop="m">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Box flexDirection="row" gap="s">
            {(["open", "closed", "all"] as const).map((s) => {
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
      </Box>

      {data.tickets.length === 0 ? (
        <KEmpty icon="inbox" title="Inbox zero" message="No tickets here right now." />
      ) : (
        <Box marginTop="l">
          <ListGroup>
            {data.tickets.map((t) => {
              return (
                <ListRow
                  key={t.id}
                  icon={t.channel === "live" ? "forum" : "assignment"}
                  title={`${ticketRef(t.displayId)} · ${t.subject}`}
                  subtitle={`${t.userName} (${t.userMatric}) · ${t.lastMessage?.message ?? "No messages"}`}
                  onPress={() => router.push(`/urus-helpdesk/${t.id}` as Href)}
                  trailing={
                    <Box flexDirection="row" gap="xs" alignItems="center">
                      <StatusChip label={statusLabel(t.status)} tone={statusTone(t.status)} />
                    </Box>
                  }
                  meta={t.assignedToName ? `→ ${t.assignedToName}` : undefined}
                />
              )
            })}
          </ListGroup>
        </Box>
      )}

      <Box height={32} />
    </Screen>
  )
}

import { useTheme } from "@shopify/restyle"
import { useState } from "react"

import { useAdminCheckin } from "@/lib/hooks"
import {
  Box,
  KButton,
  KEmpty,
  ListGroup,
  ListRow,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  type ChipTone,
} from "@/ui"

function typeTone(type: string): ChipTone {
  return type === "check_out" ? "info" : "brand"
}

function typeLabel(type: string): string {
  return type === "check_out" ? "Check-out" : "Check-in"
}

function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default function AdminCheckinScreen() {
  const theme = useTheme()
  const [tab, setTab] = useState<"records" | "sessions">("records")
  const { data, isLoading, refetch, isRefetching } = useAdminCheckin()

  if (isLoading || !data) return <LoadingScreen label="Loading check-in records…" />

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <Box marginTop="m" flexDirection="row" gap="s">
        <Box flex={1}>
          <KButton
            label="Records"
            variant={tab === "records" ? "primary" : "secondary"}
            onPress={() => setTab("records")}
          />
        </Box>
        <Box flex={1}>
          <KButton
            label="Sessions"
            variant={tab === "sessions" ? "primary" : "secondary"}
            onPress={() => setTab("sessions")}
          />
        </Box>
      </Box>

      {tab === "records" ? (
        data.records.length === 0 ? (
          <KEmpty icon="how_to_reg" title="No check-ins yet" />
        ) : (
          <Box marginTop="l">
            <ListGroup title={`${data.records.length} recent records`}>
              {data.records.map((r) => (
                <ListRow
                  key={r.id}
                  icon={r.type === "check_out" ? "logout" : "how_to_reg"}
                  title={`${r.name} · ${r.matricId}`}
                  subtitle={`${r.roomLabel}${r.manual ? " · manual" : ""}`}
                  meta={whenLabel(r.signedAt)}
                  trailing={<StatusChip label={typeLabel(r.type)} tone={typeTone(r.type)} />}
                />
              ))}
            </ListGroup>
          </Box>
        )
      ) : data.sessions.length === 0 ? (
        <KEmpty icon="qr_code_2" title="No sessions yet" />
      ) : (
        <Box gap="m" marginTop="l">
          {data.sessions.map((s) => (
            <Surface key={s.id}>
              <Box flexDirection="row" alignItems="center" gap="s">
                <StatusChip label={typeLabel(s.type)} tone={typeTone(s.type)} icon="qr_code_2" />
                <StatusChip
                  label={s.isActive ? "Active" : "Inactive"}
                  tone={s.isActive ? "success" : "neutral"}
                />
              </Box>
              <Text variant="subheading" marginTop="s">
                {s.name}
              </Text>
              <Text variant="caption" marginTop="xs">
                {s.opensAt ? `Opens ${whenLabel(s.opensAt)}` : "No opening window"}
              </Text>
              <Text variant="caption" marginTop="xs">
                {s.closesAt ? `Closes ${whenLabel(s.closesAt)}` : "No closing window"}
              </Text>
              <Text variant="caption" marginTop="xs" style={{ color: theme.colors.ink300 }}>
                Token {s.token.slice(0, 10)}…
              </Text>
            </Surface>
          ))}
        </Box>
      )}

      <Box height={32} />
    </Screen>
  )
}

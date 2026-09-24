import { useTheme } from "@shopify/restyle"
import { useState } from "react"

import { useAdminCheckin } from "@/lib/hooks"
import {
  AsyncBoundary,
  Box,
  KEmpty,
  KPill,
  ListGroup,
  ListRow,
  PillRail,
  Screen,
  Skeleton,
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
  const { data, isLoading, isError, refetch, isRefetching } = useAdminCheckin()

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      {/* Tabs stay mounted during load so the header doesn't disappear. */}
      <Box marginTop="m">
        <PillRail>
          <KPill
            label="Records"
            icon="how_to_reg"
            selected={tab === "records"}
            onPress={() => setTab("records")}
          />
          <KPill
            label="Sessions"
            icon="qr_code_2"
            selected={tab === "sessions"}
            onPress={() => setTab("sessions")}
          />
        </PillRail>
      </Box>

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.Rows count={6} />}
        errorTitle="Couldn't load check-in records"
      >
        {(loaded) =>
          tab === "records" ? (
            loaded.records.length === 0 ? (
              <KEmpty
                icon="how_to_reg"
                title="No check-ins yet"
                message="Signed check-ins and check-outs will appear here."
              />
            ) : (
              <Box marginTop="l">
                <ListGroup title={`${loaded.records.length} recent records`}>
                  {loaded.records.map((r) => (
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
          ) : loaded.sessions.length === 0 ? (
            <KEmpty
              icon="qr_code_2"
              title="No sessions yet"
              message="Check-in sessions you open will be listed here."
            />
          ) : (
            <Box gap="m" marginTop="l">
              {loaded.sessions.map((s) => (
                <Surface key={s.id}>
                  <Box flexDirection="row" alignItems="center" gap="s">
                    <StatusChip
                      label={typeLabel(s.type)}
                      tone={typeTone(s.type)}
                      icon="qr_code_2"
                    />
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
          )
        }
      </AsyncBoundary>

      <Box height={32} />
    </Screen>
  )
}

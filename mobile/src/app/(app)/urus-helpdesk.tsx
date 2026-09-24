import { ticketRef } from "@kiz/shared"
import { router, type Href } from "expo-router"
import { useState } from "react"

import { useAdminHelpdesk } from "@/lib/hooks"
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
  const [status, setStatus] = useState<"open" | "closed" | "all">("open")
  const { data, isLoading, isError, refetch, isRefetching } = useAdminHelpdesk(status)

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      {/* Filter stays mounted during load so the header doesn't disappear. */}
      <Box marginTop="m">
        <PillRail>
          {(["open", "closed", "all"] as const).map((s) => (
            <KPill
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              selected={s === status}
              onPress={() => setStatus(s)}
            />
          ))}
        </PillRail>
      </Box>

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.Rows count={5} />}
        errorTitle="Couldn't load the inbox"
      >
        {(loaded) =>
          loaded.tickets.length === 0 ? (
            <KEmpty icon="inbox" title="Inbox zero" message="No tickets here right now." />
          ) : (
            <Box marginTop="l">
              <ListGroup>
                {loaded.tickets.map((t) => (
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
                ))}
              </ListGroup>
            </Box>
          )
        }
      </AsyncBoundary>

      <Box height={32} />
    </Screen>
  )
}

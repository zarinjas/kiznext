import { HELPDESK_CATEGORIES, helpdeskCategoryMeta, ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { Linking } from "react-native"

import { useCreateTicket, useHelpdesk } from "@/lib/hooks"
import {
  AsyncBoundary,
  Box,
  KButton,
  KEmpty,
  KPill,
  ListGroup,
  ListRow,
  PillRail,
  PressScale,
  Screen,
  Skeleton,
  StatusChip,
  Surface,
  Text,
  TextField,
  type ChipTone,
} from "@/ui"
import { Icon } from "@/ui/icon"

function statusTone(status: string): ChipTone {
  switch (status) {
    case "submitted":
      return "info"
    case "under_review":
      return "warning"
    case "in_progress":
      return "brand"
    case "more_info_required":
      return "warning"
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

export default function HelpdeskScreen() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = useHelpdesk()
  const create = useCreateTicket()

  const [channel, setChannel] = useState<"live" | "ticket">("ticket")
  const [category, setCategory] = useState<string>("general_enquiry")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    if (channel === "ticket" && !subject.trim()) {
      setError("Give your request a subject.")
      return
    }
    if (!message.trim()) {
      setError(channel === "live" ? "Type your question first." : "Add a short description.")
      return
    }
    create.mutate(
      {
        channel,
        subject: channel === "live" ? undefined : subject.trim(),
        message: message.trim(),
        category: channel === "live" ? "general_enquiry" : category,
        locationDetail: location.trim() || null,
      },
      {
        onSuccess: (res) => {
          setSubject("")
          setMessage("")
          setLocation("")
          if (res?.id) router.push(`/helpdesk/${res.id}`)
        },
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't send your request."),
      }
    )
  }

  return (
    <Screen scroll edges={[]} padded={false}>
      <Box paddingHorizontal="l">
        <Box
          flexDirection="row"
          alignItems="center"
          gap="s"
          marginTop="m"
          borderRadius="input"
          backgroundColor={data?.officeOpen ? "successSoft" : "canvasSunk"}
          padding="m"
        >
          <StatusChip
            label={data?.officeOpen ? "Office open" : "Office closed"}
            tone={data?.officeOpen ? "success" : "neutral"}
          />
          <Text variant="caption" style={{ flex: 1 }}>
            {data?.officeOpen
              ? "We're online — Monday to Friday, 8:00 AM – 5:00 PM."
              : "Your request is still saved; we'll reply when the office reopens."}
          </Text>
        </Box>

        {data && data.emergencyContacts.length > 0 ? (
          <Box
            marginTop="m"
            borderRadius="input"
            borderWidth={1}
            borderColor="danger"
            backgroundColor="dangerSoft"
            padding="m"
          >
            <Text variant="bodyStrong" style={{ color: theme.colors.dangerInk }}>
              Emergency? Don&apos;t use this form.
            </Text>
            <Text variant="caption" marginTop="xs">
              For fires, injuries or security, call immediately:
            </Text>
            {/*
              These were bare ~18px text links — far below the 44px minimum, on
              the one control a panicked user needs to hit first time. Now full
              44px rows with an explicit call button.
            */}
            <Box marginTop="s" gap="xs">
              {data.emergencyContacts.map((c) => (
                <PressScale
                  key={c.id}
                  onPress={() =>
                    c.phone && Linking.openURL(`tel:${c.phone.replace(/[^+\d]/g, "")}`).catch(() => {})
                  }
                  disabled={!c.phone}
                  scaleTo={0.98}
                  accessibilityRole="button"
                  accessibilityLabel={c.phone ? `Call ${c.title} at ${c.phone}` : c.title}
                >
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    gap="s"
                    minHeight={44}
                    paddingHorizontal="s"
                    borderRadius="input"
                    style={{ backgroundColor: "rgba(220,38,38,0.08)" }}
                  >
                    <Icon name="call" size={16} color={theme.colors.dangerInk} />
                    <Text variant="caption" style={{ flex: 1, color: theme.colors.dangerInk }}>
                      {c.title}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </Text>
                  </Box>
                </PressScale>
              ))}
            </Box>
          </Box>
        ) : null}

        <Box marginTop="l">
          <Surface>
            <Text variant="subheading">
              {channel === "live" ? "Ask a quick question" : "New support ticket"}
            </Text>
            <Text variant="caption" marginTop="xs">
              {channel === "live"
                ? "Just type and send — no form, no queue."
                : "Formal requests and applications you can track."}
            </Text>

            <Box flexDirection="row" gap="s" marginTop="m">
              <Box flex={1}>
                <KButton
                  label="Support ticket"
                  variant={channel === "ticket" ? "primary" : "secondary"}
                  onPress={() => setChannel("ticket")}
                />
              </Box>
              <Box flex={1}>
                <KButton
                  label="Live chat"
                  variant={channel === "live" ? "primary" : "secondary"}
                  onPress={() => setChannel("live")}
                />
              </Box>
            </Box>

            {channel === "ticket" ? (
              <Box marginTop="l" gap="l">
                <Box>
                  <Text variant="label" marginBottom="s" marginLeft="xs">
                    CATEGORY
                  </Text>
                  <PillRail>
                    {HELPDESK_CATEGORIES.map((c) => (
                      <KPill
                        key={c.value}
                        label={c.label}
                        icon={helpdeskCategoryMeta(c.value).icon}
                        selected={c.value === category}
                        onPress={() => setCategory(c.value)}
                      />
                    ))}
                  </PillRail>
                  <Text variant="caption" marginTop="s">
                    {helpdeskCategoryMeta(category).hint}
                  </Text>
                </Box>

                <TextField
                  label="Subject"
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="e.g. Air-cond leaking in K18A-211"
                />
                <TextField
                  label="Location (optional)"
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Room or facility"
                />
              </Box>
            ) : null}

            <Box marginTop="l">
              <TextField
                label={channel === "live" ? "Your question" : "Describe the issue"}
                value={message}
                onChangeText={setMessage}
                placeholder="Type here…"
                autoCapitalize="sentences"
              />
            </Box>

            {error ? (
              <Text variant="caption" marginTop="m" style={{ color: theme.colors.dangerInk }}>
                {error}
              </Text>
            ) : null}

            <Box marginTop="l">
              <KButton label="Send request" onPress={submit} loading={create.isPending} />
            </Box>
          </Surface>
        </Box>

        <Box marginTop="xl">
          <Box flexDirection="row" alignItems="center" gap="s" marginBottom="s" marginLeft="xs">
            <Text variant="label">YOUR REQUESTS</Text>
            {data && data.unreadCount > 0 ? (
              <StatusChip label={`${data.unreadCount} unread`} tone="brand" />
            ) : null}
          </Box>

          {/*
            Only the request list is data-dependent — the ask form above must
            stay usable even if the list fails to load, so the boundary wraps
            this section alone rather than the whole screen.
          */}
          <AsyncBoundary
            data={data}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            skeleton={<Skeleton.Rows count={3} />}
            errorTitle="Couldn't load your requests"
          >
            {(loaded) =>
              loaded.tickets.length === 0 ? (
                <KEmpty
                  icon="support_agent"
                  title="No requests yet"
                  message="Your tickets and chats will show here."
                />
              ) : (
                <ListGroup>
                  {loaded.tickets.map((t) => (
                    <ListRow
                      key={t.id}
                      icon={t.channel === "live" ? "forum" : "assignment"}
                      title={`${ticketRef(t.displayId)} · ${t.subject}`}
                      subtitle={t.lastMessage?.message ?? undefined}
                      onPress={() => router.push(`/helpdesk/${t.id}`)}
                      trailing={
                        <StatusChip label={statusLabel(t.status)} tone={statusTone(t.status)} />
                      }
                    />
                  ))}
                </ListGroup>
              )
            }
          </AsyncBoundary>
        </Box>

        <Box height={32} />
      </Box>
    </Screen>
  )
}

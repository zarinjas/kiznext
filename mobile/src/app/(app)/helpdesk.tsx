import { HELPDESK_CATEGORIES, helpdeskCategoryMeta, ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router } from "expo-router"
import { useState } from "react"
import { Linking, Pressable, ScrollView } from "react-native"

import { useCreateTicket, useHelpdesk } from "@/lib/hooks"
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
  TextField,
  type ChipTone,
} from "@/ui"

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
  const { data, isLoading, isError } = useHelpdesk()
  const create = useCreateTicket()

  const [channel, setChannel] = useState<"live" | "ticket">("ticket")
  const [category, setCategory] = useState<string>("general_enquiry")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [location, setLocation] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (isLoading) return <LoadingScreen label="Loading helpdesk…" />

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
            <Box marginTop="s" gap="xs">
              {data.emergencyContacts.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => c.phone && Linking.openURL(`tel:${c.phone}`)}
                >
                  <Text variant="caption" style={{ color: theme.colors.dangerInk }}>
                    {c.title}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </Text>
                </Pressable>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Box flexDirection="row" gap="s">
                      {HELPDESK_CATEGORIES.map((c) => {
                        const active = c.value === category
                        return (
                          <Pressable key={c.value} onPress={() => setCategory(c.value)}>
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
                                style={{ color: active ? theme.colors.brand700 : theme.colors.ink500 }}
                              >
                                {c.label}
                              </Text>
                            </Box>
                          </Pressable>
                        )
                      })}
                    </Box>
                  </ScrollView>
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

          {isError ? (
            <KEmpty icon="error_outline" title="Couldn't load your requests" />
          ) : !data || data.tickets.length === 0 ? (
            <KEmpty icon="support_agent" title="No requests yet" message="Your tickets and chats will show here." />
          ) : (
            <ListGroup>
              {data.tickets.map((t) => (
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
          )}
        </Box>

        <Box height={32} />
      </Box>
    </Screen>
  )
}

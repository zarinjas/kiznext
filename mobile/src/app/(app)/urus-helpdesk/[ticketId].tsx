import { helpdeskCategoryMeta, helpdeskLocationLabel, ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { useAdminTicketAction, useHelpdeskThread, useSendReply } from "@/lib/hooks"
import {
  Box,
  KButton,
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

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default function AdminTicketScreen() {
  const theme = useTheme()
  const { user } = useAuth()
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>()
  const { data, isLoading } = useHelpdeskThread(ticketId)
  const reply = useSendReply(ticketId)
  const action = useAdminTicketAction(ticketId)
  const [text, setText] = useState("")

  if (isLoading || !data) return <LoadingScreen label="Loading ticket…" />

  const { ticket, messages, canReply } = data
  const category = helpdeskCategoryMeta(ticket.category)
  const closed = ticket.status === "closed"
  const resolved = ticket.status === "resolved"

  function submit() {
    const value = text.trim()
    if (!value) return
    reply.mutate(value)
    setText("")
  }

  return (
    <Screen padded={false} edges={[]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Box
          paddingHorizontal="l"
          paddingVertical="m"
          borderBottomWidth={1}
          borderBottomColor="border"
          gap="xs"
        >
          <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
            <StatusChip label={ticketRef(ticket.displayId)} tone="neutral" />
            <StatusChip label={statusLabel(ticket.status)} tone={statusTone(ticket.status)} />
            <StatusChip label={category.label} tone="brand" icon={category.icon} />
            <StatusChip
              label={ticket.channel === "live" ? "Live chat" : "Ticket"}
              tone={ticket.channel === "live" ? "info" : "neutral"}
            />
          </Box>
          <Text variant="subheading">{ticket.subject}</Text>
          {helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail) ? (
            <Text variant="caption">
              {helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)}
            </Text>
          ) : null}
        </Box>

        {/* Admin action bar */}
        <Box
          flexDirection="row"
          gap="s"
          paddingHorizontal="l"
          paddingVertical="s"
          borderBottomWidth={1}
          borderBottomColor="border"
          flexWrap="wrap"
        >
          <Box flex={1} minWidth={120}>
            <KButton
              label="Take ticket"
              variant="secondary"
              onPress={() => action.mutate("assign")}
              loading={action.isPending}
            />
          </Box>
          {!resolved && !closed ? (
            <Box flex={1} minWidth={120}>
              <KButton
                label="Mark resolved"
                onPress={() => action.mutate("resolve")}
                loading={action.isPending}
              />
            </Box>
          ) : (
            <Box flex={1} minWidth={120}>
              <KButton
                label="Reopen"
                variant="secondary"
                onPress={() => action.mutate("reopen")}
                loading={action.isPending}
              />
            </Box>
          )}
          <Box flex={1} minWidth={120}>
            <KButton
              label="Ask for info"
              variant="secondary"
              onPress={() => action.mutate("more_info")}
              loading={action.isPending}
            />
          </Box>
          {!closed ? (
            <Box flex={1} minWidth={120}>
              <KButton
                label="Close"
                variant="secondary"
                onPress={() => action.mutate("close")}
                loading={action.isPending}
              />
            </Box>
          ) : null}
        </Box>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {messages.map((m) => {
            const mine = m.sender.id === user?.id
            return (
              <Box key={m.id} alignItems={mine ? "flex-end" : "flex-start"}>
                <Text variant="caption" marginBottom="xs">
                  {mine ? "You" : m.sender.name} · {timeLabel(m.createdAt)}
                </Text>
                <Box
                  maxWidth="85%"
                  padding="m"
                  borderRadius="card"
                  backgroundColor={m.isAutoReply ? "warningSoft" : mine ? "brand50" : "canvasSunk"}
                >
                  <Text variant="body" style={{ color: mine ? theme.colors.brand900 : theme.colors.ink700 }}>
                    {m.message}
                  </Text>
                </Box>
              </Box>
            )
          })}
        </ScrollView>

        {canReply ? (
          <Box
            flexDirection="row"
            alignItems="flex-end"
            gap="s"
            paddingHorizontal="l"
            paddingVertical="s"
            borderTopWidth={1}
            borderTopColor="border"
          >
            <Box
              flex={1}
              borderWidth={1}
              borderColor="borderStrong"
              borderRadius="input"
              paddingHorizontal="m"
            >
              <TextInput
                style={{ minHeight: 44, maxHeight: 120, fontSize: 15, color: theme.colors.ink900 }}
                value={text}
                onChangeText={setText}
                placeholder="Reply to the resident…"
                placeholderTextColor={theme.colors.ink300}
                multiline
              />
            </Box>
            <Pressable
              onPress={submit}
              disabled={!text.trim() || reply.isPending}
              style={{
                paddingHorizontal: 16,
                height: 44,
                borderRadius: theme.borderRadii.button,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: text.trim() ? theme.colors.brand600 : theme.colors.border,
              }}
            >
              <Text variant="button" style={{ color: "#FFFFFF" }}>
                Send
              </Text>
            </Pressable>
          </Box>
        ) : (
          <Box padding="l" borderTopWidth={1} borderTopColor="border">
            <Text variant="caption" textAlign="center">
              This ticket is closed.
            </Text>
          </Box>
        )}
      </KeyboardAvoidingView>
    </Screen>
  )
}

import { CHAT_REACTION_EMOJIS, chatRoleBadge } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { useMemo, useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from "react-native"

import { absoluteUrl } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"
import { useChat, useSendChat, useToggleReaction } from "@/lib/hooks"
import type { ChatMessage } from "@/lib/types"
import {
  Box,
  LoadingScreen,
  Screen,
  StatusChip,
  Text,
  type ChipTone,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

function roleTone(role: string): ChipTone {
  switch (role) {
    case "superadmin":
      return "danger"
    case "admin_kiz":
      return "brand"
    case "staf":
      return "info"
    case "fellow":
      return "warning"
    default:
      return "neutral"
  }
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function Bubble({
  message,
  onLongPress,
  onPress,
}: {
  message: ChatMessage
  onLongPress: () => void
  onPress: () => void
}) {
  const theme = useTheme<Theme>()
  const badge = chatRoleBadge(message.sender.role)
  const avatar = absoluteUrl(message.sender.avatarUrl)

  return (
    <Box flexDirection="row" gap="s" paddingHorizontal="l" paddingVertical="xs" alignItems="flex-start">
      <Box
        width={32}
        height={32}
        borderRadius="pill"
        overflow="hidden"
        backgroundColor="canvasSunk"
        alignItems="center"
        justifyContent="center"
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={{ width: 32, height: 32 }} contentFit="cover" />
        ) : (
          <Text variant="caption">{message.sender.name.charAt(0).toUpperCase()}</Text>
        )}
      </Box>

      <Box flex={1} minWidth={0}>
        <Box flexDirection="row" alignItems="center" gap="xs">
          <Text variant="caption" style={{ fontWeight: "600", color: theme.colors.ink900 }} numberOfLines={1}>
            {message.sender.name}
          </Text>
          <StatusChip label={badge.label} tone={roleTone(message.sender.role)} />
          <Text variant="caption" style={{ marginLeft: "auto" }}>
            {timeLabel(message.createdAt)}
          </Text>
        </Box>

        {message.replyPreview ? (
          <Box
            marginTop="xs"
            paddingLeft="s"
            borderLeftWidth={2}
            borderLeftColor="brand300"
          >
            <Text variant="caption" numberOfLines={1}>
              {message.replyPreview.senderName}: {message.replyPreview.text}
            </Text>
          </Box>
        ) : null}

        <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250}>
          <Text variant="body" marginTop="xs">
            {message.message}
          </Text>
        </Pressable>

        {message.reactions.length > 0 ? (
          <Box flexDirection="row" gap="xs" flexWrap="wrap" marginTop="xs">
            {message.reactions.map((r) => (
              <Pressable key={r.emoji} onPress={onLongPress}>
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  borderRadius="pill"
                  borderWidth={1}
                  borderColor={r.mine ? "brand300" : "border"}
                  backgroundColor={r.mine ? "brand50" : "canvasSunk"}
                >
                  <Text variant="caption">{r.emoji}</Text>
                  <Text variant="caption">{r.count}</Text>
                </Box>
              </Pressable>
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

export default function ChatScreen() {
  const theme = useTheme<Theme>()
  const { user } = useAuth()
  const { data, isLoading } = useChat()
  const send = useSendChat()
  const react = useToggleReaction()

  const [text, setText] = useState("")
  const [pickerFor, setPickerFor] = useState<ChatMessage | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)

  const chat = data?.chat
  const messages = useMemo(() => [...(chat?.messages ?? [])].reverse(), [chat?.messages])

  if (isLoading || !chat) return <LoadingScreen label="Loading the room…" />

  function submit() {
    const value = text.trim()
    if (!value) return
    send.mutate({ message: value, replyToId: replyTo?.id ?? null })
    setText("")
    setReplyTo(null)
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Box
          paddingHorizontal="l"
          paddingVertical="m"
          borderBottomWidth={1}
          borderBottomColor="border"
        >
          <Text variant="heading">Community</Text>
          <Text variant="caption">
            {chat.memberCount} members · {chat.onlineCount} online
          </Text>
        </Box>

        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Bubble
              message={item}
              onLongPress={() => setPickerFor(item)}
              onPress={() => setReplyTo(item)}
            />
          )}
          contentContainerStyle={{ paddingVertical: 12 }}
        />

        {pickerFor ? (
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            paddingHorizontal="l"
            paddingVertical="s"
            borderTopWidth={1}
            borderTopColor="border"
            backgroundColor="canvasSunk"
          >
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              React to {pickerFor.sender.name}
            </Text>
            {CHAT_REACTION_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  react.mutate({ messageId: pickerFor.id, emoji })
                  setPickerFor(null)
                }}
              >
                <Text variant="subheading">{emoji}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickerFor(null)}>
              <Icon name="chevron_right" size={18} color={theme.colors.ink300} />
            </Pressable>
          </Box>
        ) : null}

        {replyTo ? (
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            paddingHorizontal="l"
            paddingVertical="s"
            borderTopWidth={1}
            borderTopColor="border"
            backgroundColor="brand50"
          >
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              Replying to {replyTo.sender.name}
            </Text>
            <Pressable onPress={() => setReplyTo(null)}>
              <Icon name="chevron_right" size={18} color={theme.colors.brand700} />
            </Pressable>
          </Box>
        ) : null}

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
              placeholder={user ? `Message as ${user.name.split(" ")[0]}…` : "Message…"}
              placeholderTextColor={theme.colors.ink300}
              multiline
            />
          </Box>
          <Pressable
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: text.trim() ? theme.colors.brand600 : theme.colors.border,
            }}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </Screen>
  )
}

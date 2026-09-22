import { CHAT_REACTION_EMOJIS, CHAT_REPORT_REASONS, chatRoleBadge } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import * as DocumentPicker from "expo-document-picker"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import { useMemo, useState } from "react"
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native"

import { absoluteUrl } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"
import {
  uploadChatAttachment,
  useChat,
  useReportChatMessage,
  useSendChat,
  useToggleReaction,
} from "@/lib/hooks"
import type { ChatMessage } from "@/lib/types"
import {
  Box,
  KButton,
  LoadingScreen,
  Screen,
  StatusChip,
  Text,
  TextField,
  type ChipTone,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

interface PickedFile {
  uri: string
  name: string
  mime: string
  kind: "image" | "pdf" | "file"
}

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

function kindFor(name: string, mime: string): "image" | "pdf" | "file" {
  if (mime.startsWith("image/")) return "image"
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf"
  return "file"
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
  const attachment = absoluteUrl(message.attachmentUrl)

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
          <Box marginTop="xs" paddingLeft="s" borderLeftWidth={2} borderLeftColor="brand300">
            <Text variant="caption" numberOfLines={1}>
              {message.replyPreview.senderName}: {message.replyPreview.text}
            </Text>
          </Box>
        ) : null}

        {message.message ? (
          <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={250}>
            <Text variant="body" marginTop="xs">
              {message.message}
            </Text>
          </Pressable>
        ) : null}

        {attachment && message.attachmentType === "image" ? (
          <Pressable onLongPress={onLongPress}>
            <Image
              source={{ uri: attachment }}
              style={{ width: 200, height: 200, borderRadius: theme.borderRadii.card, marginTop: 6 }}
              contentFit="cover"
            />
          </Pressable>
        ) : null}

        {attachment && message.attachmentType === "pdf" ? (
          <Pressable
            onLongPress={onLongPress}
            onPress={() =>
              router.push({
                pathname: "/pdf-viewer",
                params: { url: attachment, title: message.attachmentName ?? "Attachment" },
              })
            }
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="s"
              marginTop="xs"
              paddingHorizontal="m"
              paddingVertical="s"
              borderRadius="input"
              borderWidth={1}
              borderColor="border"
              backgroundColor="canvasSunk"
            >
              <Icon name="attachment" size={18} color={theme.colors.ink500} />
              <Text variant="caption" flex={1} numberOfLines={1}>
                {message.attachmentName ?? "Document.pdf"}
              </Text>
            </Box>
          </Pressable>
        ) : null}

        {attachment && message.attachmentType === "file" ? (
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            marginTop="xs"
            paddingHorizontal="m"
            paddingVertical="s"
            borderRadius="input"
            borderWidth={1}
            borderColor="border"
            backgroundColor="canvasSunk"
          >
            <Icon name="attachment" size={18} color={theme.colors.ink500} />
            <Text variant="caption" flex={1} numberOfLines={1}>
              {message.attachmentName ?? "Attachment"}
            </Text>
          </Box>
        ) : null}

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
  const report = useReportChatMessage()

  const [text, setText] = useState("")
  const [pickerFor, setPickerFor] = useState<ChatMessage | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [attachment, setAttachment] = useState<PickedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null)

  const chat = data?.chat
  const messages = useMemo(() => [...(chat?.messages ?? [])].reverse(), [chat?.messages])

  if (isLoading || !chat) return <LoadingScreen label="Loading the room…" />

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Photo library access is needed to attach a photo.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const name = asset.fileName ?? "photo.jpg"
    const mime = asset.mimeType ?? "image/jpeg"
    setAttachment({ uri: asset.uri, name, mime, kind: "image" })
  }

  async function pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    const name = asset.name ?? "document.pdf"
    const mime = asset.mimeType ?? "application/pdf"
    setAttachment({ uri: asset.uri, name, mime, kind: kindFor(name, mime) })
  }

  async function submit() {
    const value = text.trim()
    if ((!value && !attachment) || uploading || send.isPending) return
    setUploading(true)
    try {
      let att: { url: string; type: string; name: string } | null = null
      if (attachment) {
        const up = await uploadChatAttachment(attachment.uri, attachment.name, attachment.mime)
        att = { url: up.url, type: attachment.kind, name: attachment.name }
      }
      await send.mutateAsync({ message: value, replyToId: replyTo?.id ?? null, attachment: att })
      setText("")
      setReplyTo(null)
      setAttachment(null)
    } catch (e) {
      Alert.alert("Couldn't send", e instanceof Error ? e.message : "Try again.")
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || send.isPending
  const canSend = Boolean(text.trim() || attachment)

  return (
    <Screen padded={false} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Box paddingHorizontal="l" paddingVertical="m" borderBottomWidth={1} borderBottomColor="border">
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
            {pickerFor.sender.id !== user?.id ? (
              <Pressable
                onPress={() => {
                  setReportFor(pickerFor)
                  setPickerFor(null)
                }}
              >
                <Icon name="error_outline" size={18} color={theme.colors.dangerInk} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => setPickerFor(null)}>
              <Icon name="close" size={18} color={theme.colors.ink300} />
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
              <Icon name="close" size={18} color={theme.colors.brand700} />
            </Pressable>
          </Box>
        ) : null}

        {attachment ? (
          <Box
            flexDirection="row"
            alignItems="center"
            gap="s"
            paddingHorizontal="l"
            paddingVertical="s"
            borderTopWidth={1}
            borderTopColor="border"
          >
            <Icon name="attachment" size={16} color={theme.colors.ink500} />
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {attachment.name}
            </Text>
            <Pressable onPress={() => setAttachment(null)}>
              <Icon name="close" size={16} color={theme.colors.ink500} />
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
          <Pressable onPress={pickImage} disabled={busy}>
            <Icon name="photo_camera" size={22} color={theme.colors.ink500} />
          </Pressable>
          <Pressable onPress={pickDocument} disabled={busy}>
            <Icon name="attachment" size={22} color={theme.colors.ink500} />
          </Pressable>

          <Box flex={1} borderWidth={1} borderColor="borderStrong" borderRadius="input" paddingHorizontal="m">
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
            disabled={!canSend || busy}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canSend ? theme.colors.brand600 : theme.colors.border,
            }}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>

      <ReportModal message={reportFor} onClose={() => setReportFor(null)} report={report} />
    </Screen>
  )
}

function ReportModal({
  message,
  onClose,
  report,
}: {
  message: ChatMessage | null
  onClose: () => void
  report: ReturnType<typeof useReportChatMessage>
}) {
  const theme = useTheme<Theme>()
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState("")

  function submit() {
    if (!message || !reason) return
    report.mutate(
      { messageId: message.id, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setReason(null)
          setNote("")
          onClose()
          Alert.alert("Report sent", "Thanks — the KIZ team will review this message.")
        },
        onError: (e) => Alert.alert("Couldn't report", e instanceof Error ? e.message : "Try again."),
      }
    )
  }

  return (
    <Modal visible={Boolean(message)} animationType="slide" transparent onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <Box backgroundColor="surface" borderTopLeftRadius="sheet" borderTopRightRadius="sheet" maxHeight="92%">
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text variant="heading">Report message</Text>
              <Pressable onPress={onClose}>
                <Text variant="caption">Close</Text>
              </Pressable>
            </Box>

            {message ? (
              <Box gap="m" marginTop="l">
                <Box padding="m" borderRadius="input" backgroundColor="canvasSunk">
                  <Text variant="caption" numberOfLines={3}>
                    {message.sender.name}: {message.message || "[attachment]"}
                  </Text>
                </Box>

                <Text variant="label">WHY ARE YOU REPORTING THIS?</Text>
                <Box gap="s">
                  {CHAT_REPORT_REASONS.map((r) => {
                    const active = reason === r.value
                    return (
                      <Pressable key={r.value} onPress={() => setReason(r.value)}>
                        <Box
                          flexDirection="row"
                          alignItems="center"
                          gap="s"
                          paddingHorizontal="m"
                          paddingVertical="m"
                          borderRadius="input"
                          borderWidth={1}
                          borderColor={active ? "brand600" : "border"}
                          backgroundColor={active ? "brand50" : "surface"}
                        >
                          <Icon
                            name={active ? "check_circle" : "radio_button_unchecked"}
                            size={18}
                            color={active ? theme.colors.brand600 : theme.colors.ink300}
                          />
                          <Text variant="body">{r.label}</Text>
                        </Box>
                      </Pressable>
                    )
                  })}
                </Box>

                <TextField
                  label="Add a note (optional)"
                  value={note}
                  onChangeText={setNote}
                  autoCapitalize="sentences"
                />

                <KButton
                  label="Submit report"
                  onPress={submit}
                  disabled={!reason}
                  loading={report.isPending}
                />
              </Box>
            ) : null}
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  )
}

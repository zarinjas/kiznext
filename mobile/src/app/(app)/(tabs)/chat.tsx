import { CHAT_REACTION_EMOJIS, CHAT_REPORT_REASONS, color } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import * as DocumentPicker from "expo-document-picker"
import { Image } from "expo-image"
import * as ImagePicker from "expo-image-picker"
import { router } from "expo-router"
import { useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { absoluteUrl } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"
import { useLayout } from "@/lib/responsive"
import {
  uploadChatAttachment,
  useChat,
  useReportChatMessage,
  useSendChat,
  useToggleReaction,
} from "@/lib/hooks"
import type { ChatMessage } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  KButton,
  KIconButton,
  PressScale,
  Screen,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useToast,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

interface PickedFile {
  uri: string
  name: string
  mime: string
  kind: "image" | "pdf" | "file"
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

function Avatar({ name, avatar }: { name: string; avatar: string | null }) {
  const theme = useTheme<Theme>()
  return (
    <Box
      width={30}
      height={30}
      borderRadius="pill"
      overflow="hidden"
      backgroundColor="canvasSunk"
      borderWidth={1}
      borderColor="border"
      alignItems="center"
      justifyContent="center"
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: 30, height: 30 }} contentFit="cover" />
      ) : (
        <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "700" }}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </Box>
  )
}

/**
 * Sender name tints.
 *
 * Derived from the design-token ramps rather than the raw WhatsApp-ish hexes
 * that were here before. Names still need to be visually distinguishable in a
 * busy room, but the palette now belongs to the app.
 */
const SENDER_COLORS = [
  color.brand[700],
  color.accent[600],
  color.info.ink,
  color.success.ink,
  color.warning.ink,
  color.danger.ink,
]

function senderColor(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length]
}

function Bubble({
  message,
  mine,
  onLongPress,
}: {
  message: ChatMessage
  mine: boolean
  onLongPress: () => void
}) {
  const theme = useTheme<Theme>()
  // Percentage-only max width became an ~800pt line on an iPad.
  const { bubbleMaxWidth, width } = useLayout()
  const avatar = absoluteUrl(message.sender.avatarUrl)
  const attachment = absoluteUrl(message.attachmentUrl)
  // A fixed 210pt thumbnail was a stamp inside a 460pt iPad bubble.
  const imageWidth = Math.min(260, width * 0.5)

  const textColor = theme.colors.ink900
  const subColor = theme.colors.ink700

  return (
    <Box
      flexDirection="row"
      gap="s"
      paddingHorizontal="l"
      paddingVertical="xs"
      alignItems="flex-end"
      justifyContent={mine ? "flex-end" : "flex-start"}
    >
      {!mine ? <Avatar name={message.sender.name} avatar={avatar} /> : null}

      <Box maxWidth={bubbleMaxWidth} minWidth={0} alignItems={mine ? "flex-end" : "flex-start"}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Message from ${mine ? "you" : message.sender.name}. Hold for actions.`} onLongPress={onLongPress} delayLongPress={250}>
          <Box
            paddingHorizontal="m"
            paddingVertical="s"
            borderRadius="cardLg"
            style={{
              // Own messages use the brand tint; others sit on pure white —
              // consistent with the rest of the app's surfaces.
              backgroundColor: mine ? theme.colors.brand50 : theme.colors.surface,
              borderTopRightRadius: mine ? 4 : theme.borderRadii.cardLg,
              borderTopLeftRadius: mine ? theme.borderRadii.cardLg : 4,
            }}
            borderWidth={1}
            borderColor={mine ? "brand100" : "border"}
          >
            {!mine ? (
              <Text variant="caption" numberOfLines={1} style={{ color: senderColor(message.sender.id), fontWeight: "700", marginBottom: 2 }}>
                {message.sender.name}
              </Text>
            ) : null}
            {message.replyPreview ? (
              <Box
                marginBottom="s"
                paddingLeft="s"
                borderLeftWidth={2}
                style={{ borderLeftColor: theme.colors.brand300 }}
              >
                <Text variant="caption" numberOfLines={1} style={{ color: subColor }}>
                  {message.replyPreview.senderName}: {message.replyPreview.text || "📎 Attachment"}
                </Text>
              </Box>
            ) : null}

            {message.message ? (
              <Text variant="body" style={{ color: textColor }}>
                {message.message}
              </Text>
            ) : null}

            {attachment && message.attachmentType === "image" ? (
              <Image
                source={{ uri: attachment }}
                style={{
                  width: imageWidth,
                  height: imageWidth * 0.9,
                  borderRadius: theme.borderRadii.card,
                  marginTop: 6,
                }}
                contentFit="cover"
              />
            ) : null}

            {attachment && message.attachmentType === "pdf" ? (
              <Pressable
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
                  marginTop="s"
                  paddingHorizontal="s"
                  paddingVertical="s"
                  borderRadius="input"
                  style={{ backgroundColor: theme.colors.canvasSunk }}
                >
                  <Icon name="attachment" size={18} color={theme.colors.ink500} />
                  <Text
                    variant="caption"
                    flex={1}
                    numberOfLines={1}
                    style={{ color: theme.colors.ink700 }}
                  >
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
                marginTop="s"
                paddingHorizontal="s"
                paddingVertical="s"
                borderRadius="input"
                style={{ backgroundColor: theme.colors.canvasSunk }}
              >
                <Icon name="attachment" size={18} color={theme.colors.ink500} />
                <Text
                  variant="caption"
                  flex={1}
                  numberOfLines={1}
                  style={{ color: theme.colors.ink700 }}
                >
                  {message.attachmentName ?? "Attachment"}
                </Text>
              </Box>
            ) : null}

            {/*
              No delivery tick. `ChatMessage` carries no delivery/read state, so
              the checkmark that used to render here was decorative — a UI
              element asserting something the app cannot know.
            */}
            <Box flexDirection="row" justifyContent="flex-end" alignItems="center" marginTop="xs" gap="xs">
              <Text variant="caption" style={{ color: theme.colors.ink300, fontSize: 10 }}>
                {timeLabel(message.createdAt)}
              </Text>
            </Box>
          </Box>
        </Pressable>

        {message.reactions.length > 0 ? (
          <Box flexDirection="row" gap="xs" flexWrap="wrap" marginTop="xs">
            {message.reactions.map((r) => (
              <Pressable
                key={r.emoji}
                onPress={onLongPress}
                accessibilityRole="button"
                accessibilityLabel={`${r.emoji} ${r.count}. Open message actions.`}
                accessibilityState={{ selected: r.mine }}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="center"
                  gap="xs"
                  minHeight={36}
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  borderRadius="pill"
                  borderWidth={1}
                  borderColor={r.mine ? "brand300" : "border"}
                  backgroundColor={r.mine ? "brand50" : "surface"}
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
  const toast = useToast()
  const { data, isLoading, isError, refetch } = useChat()
  // The custom header lives *inside* the keyboard-avoiding view, which itself
  // sits inside a SafeAreaView that already offsets the top notch. iOS needs to
  // know that offset or the composer is pushed by the wrong amount and the
  // keyboard covers the input.
  const insets = useSafeAreaInsets()
  const send = useSendChat()
  const react = useToggleReaction()
  const report = useReportChatMessage()

  const [text, setText] = useState("")
  const [pickerFor, setPickerFor] = useState<ChatMessage | null>(null)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [attachment, setAttachment] = useState<PickedFile | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null)
  const listRef = useRef<FlatList<ChatMessage>>(null)

  const chat = data?.chat
  const messages = useMemo(() => [...(chat?.messages ?? [])].reverse(), [chat?.messages])

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      toast.warning("Photo library access is needed to attach a photo.")
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
    const submittedAttachment = attachment
    const submittedReply = replyTo
    setText("")
    setAttachment(null)
    setReplyTo(null)
    setUploading(true)
    try {
      let att: { url: string; type: string; name: string } | null = null
      if (submittedAttachment) {
        const up = await uploadChatAttachment(submittedAttachment.uri, submittedAttachment.name, submittedAttachment.mime)
        att = { url: up.url, type: submittedAttachment.kind, name: submittedAttachment.name }
      }
      await send.mutateAsync({ message: value, replyToId: submittedReply?.id ?? null, attachment: att })
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }))
    } catch (e) {
      setText((current) => current || value)
      setAttachment((current) => current ?? submittedAttachment)
      setReplyTo((current) => current ?? submittedReply)
      toast.error(e instanceof Error ? e.message : "Couldn't send. Try again.")
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || send.isPending
  const canSend = Boolean(text.trim() || attachment)

  return (
    <Screen padded={false} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <Box paddingHorizontal="l" paddingVertical="m" borderBottomWidth={1} borderBottomColor="border" backgroundColor="surface">
          <Box flexDirection="row" alignItems="center" gap="m">
            <Box width={44} height={44} borderRadius="pill" backgroundColor="brand50" alignItems="center" justifyContent="center">
              <Icon name="forum" size={23} color={theme.colors.brand700} />
            </Box>
            <Box flex={1}>
              <Text variant="heading">KIZ Community</Text>
              {chat ? (
                <Box flexDirection="row" alignItems="center" gap="xs">
                  <Box width={7} height={7} borderRadius="pill" backgroundColor="success" />
                  <Text variant="caption">{chat.memberCount} members · {chat.onlineCount} online</Text>
                </Box>
              ) : (
                <Text variant="caption">Loading the room…</Text>
              )}
            </Box>
          </Box>
        </Box>

        {/*
          Only the list area swaps to a skeleton — the header and composer stay
          mounted so a draft survives a background refetch. `useChat` keeps
          polling every 3s underneath.
        */}
        <Box style={styles.messageList}>
          <AsyncBoundary
            data={data}
            isLoading={isLoading}
            isError={isError}
            refetch={() => refetch()}
            skeleton={<Skeleton.Bubbles count={6} />}
            errorTitle="Couldn't load the room"
            errorMessage="Check your connection and try again."
          >
            {() => (
              <FlatList
                ref={listRef}
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Bubble
                    message={item}
                    mine={item.sender.id === user?.id}
                    onLongPress={() => setPickerFor(item)}
                  />
                )}
                contentContainerStyle={{ paddingVertical: 12, flexGrow: 1, justifyContent: messages.length ? "flex-start" : "center" }}
                style={styles.messageList}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={<Box alignItems="center" padding="xl"><Icon name="forum" size={36} color={theme.colors.ink300} /><Text variant="bodyStrong" marginTop="m">Start the conversation</Text><Text variant="caption" textAlign="center" marginTop="xs">Say hello to your KIZ community.</Text></Box>}
              />
            )}
          </AsyncBoundary>
        </Box>

        {pickerFor ? (
          <Box
            gap="xs"
            paddingHorizontal="l"
            paddingVertical="s"
            borderTopWidth={1}
            borderTopColor="border"
            backgroundColor="canvasSunk"
          >
            {/*
              Two rows, because six 44pt emoji plus three 44pt buttons cannot
              share one line on a phone. Every control is a full 44pt target;
              the emoji glyph itself is unchanged — only the hit area grew.
              The header names the message being acted on instead of the old
              placeholder "Message actions".
            */}
            <Box flexDirection="row" alignItems="center" gap="s">
              <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                {pickerFor.sender.name}: {pickerFor.message || "📎 Attachment"}
              </Text>
              <KIconButton icon="close" label="Close message actions" onPress={() => setPickerFor(null)} />
            </Box>

            <Box flexDirection="row" alignItems="center" flexWrap="wrap">
              {CHAT_REACTION_EMOJIS.map((emoji) => (
                <PressScale
                  key={emoji}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`React with ${emoji}`}
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                  onPress={() => {
                    react.mutate({ messageId: pickerFor.id, emoji })
                    setPickerFor(null)
                  }}
                >
                  <Text variant="subheading">{emoji}</Text>
                </PressScale>
              ))}

              <Box flex={1} />

              {pickerFor.sender.id !== user?.id ? (
                <KIconButton
                  icon="error_outline"
                  label="Report message"
                  tone="danger"
                  onPress={() => {
                    setReportFor(pickerFor)
                    setPickerFor(null)
                  }}
                />
              ) : null}
              <KIconButton
                icon="reply"
                label="Reply"
                tone="brand"
                onPress={() => {
                  setReplyTo(pickerFor)
                  setPickerFor(null)
                }}
              />
            </Box>
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
            <KIconButton icon="close" label="Cancel reply" tone="brand" onPress={() => setReplyTo(null)} />
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
            <KIconButton icon="close" label="Remove attachment" onPress={() => setAttachment(null)} />
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
          backgroundColor="surface"
          style={styles.composer}
        >
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Attach photo"
            accessibilityState={{ disabled: busy }}
            scaleTo={0.9}
            disabled={busy}
            onPress={pickImage}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="photo_camera" size={22} color={theme.colors.ink500} />
          </PressScale>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel="Attach document"
            accessibilityState={{ disabled: busy }}
            scaleTo={0.9}
            disabled={busy}
            onPress={pickDocument}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="attachment" size={22} color={theme.colors.ink500} />
          </PressScale>

          <Box flex={1} borderWidth={1} borderColor="borderStrong" borderRadius="sheet" paddingHorizontal="m" backgroundColor="canvasSunk">
            <TextInput
              style={{ minHeight: 44, maxHeight: 120, paddingVertical: 11, fontSize: 15, lineHeight: 21, color: theme.colors.ink900, textAlignVertical: "top" }}
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={theme.colors.ink300}
              selectionColor={theme.colors.brand600}
              multiline
              maxLength={4000}
              submitBehavior="submit"
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
          </Box>
          <PressScale
            onPress={submit}
            disabled={!canSend || busy}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend || busy, busy }}
            style={{
              width: 44,
              height: 44,
              borderRadius: theme.borderRadii.pill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: canSend && !busy ? theme.colors.brand600 : theme.colors.border,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <Icon name="send" size={20} color={theme.colors.white} />
            )}
          </PressScale>
        </Box>
      </KeyboardAvoidingView>

      <ReportSheet message={reportFor} onClose={() => setReportFor(null)} report={report} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  // Was a WhatsApp beige (#EFEAE2). The design system specifies pure-white
  // surfaces with a faint sunk canvas — this screen was the only one breaking it.
  screen: { flex: 1, backgroundColor: color.canvasSunk },
  messageList: { flex: 1, backgroundColor: color.canvasSunk },
  composer: {
    shadowColor: color.ink[900],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
})

function ReportSheet({
  message,
  onClose,
  report,
}: {
  message: ChatMessage | null
  onClose: () => void
  report: ReturnType<typeof useReportChatMessage>
}) {
  const theme = useTheme<Theme>()
  const toast = useToast()
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
          toast.success("Report sent — the KIZ team will review this message.")
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't report. Try again."),
      }
    )
  }

  return (
    <Sheet
      visible={Boolean(message)}
      onClose={onClose}
      title="Report message"
      subtitle="Only the KIZ team sees this report."
      footer={
        <KButton
          label="Submit report"
          onPress={submit}
          disabled={!reason}
          loading={report.isPending}
        />
      }
    >
      {message ? (
        <Box gap="m" paddingBottom="m">
          <Box padding="m" borderRadius="input" backgroundColor="canvasSunk">
            <Text variant="caption" numberOfLines={3}>
              {message.sender.name}: {message.message || "[attachment]"}
            </Text>
          </Box>

          <Text variant="label">WHY ARE YOU REPORTING THIS?</Text>
          {/*
            Kept as full-width rows rather than pills — the labels are long
            sentences. Each row is now a 44pt target with a radio role.
          */}
          <Box gap="s">
            {CHAT_REPORT_REASONS.map((r) => {
              const active = reason === r.value
              return (
                <PressScale
                  key={r.value}
                  onPress={() => setReason(r.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={r.label}
                  accessibilityState={{ selected: active, checked: active }}
                  scaleTo={0.98}
                >
                  <Box
                    flexDirection="row"
                    alignItems="center"
                    gap="s"
                    minHeight={44}
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
                </PressScale>
              )
            })}
          </Box>

          <TextField
            label="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            autoCapitalize="sentences"
          />
        </Box>
      ) : null}
    </Sheet>
  )
}

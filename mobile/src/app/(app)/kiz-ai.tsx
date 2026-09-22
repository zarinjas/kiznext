import { useTheme } from "@shopify/restyle"
import * as WebBrowser from "expo-web-browser"
import { router } from "expo-router"
import { useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput } from "react-native"

import { askConcierge } from "@/lib/hooks"
import { absoluteUrl } from "@/lib/config"
import type { ConciergeReply } from "@/lib/types"
import { Box, KButton, Screen, Surface, Text, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

interface Turn {
  id: string
  role: "user" | "ai"
  text: string
  reply?: ConciergeReply
}

let seq = 0
function nextId(): string {
  seq += 1
  return `t${seq}`
}

export default function KizAiScreen() {
  const theme = useTheme<Theme>()
  const scrollRef = useRef<ScrollView>(null)

  const [turns, setTurns] = useState<Turn[]>([
    {
      id: "greeting",
      role: "ai",
      text: "Hi! I'm KIZ-AI. Ask me anything about life at Kolej Ibu Zain — rooms, facilities, helpdesk, payments and more.",
    },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)

  async function send() {
    const question = input.trim()
    if (!question || busy) return
    setInput("")
    setTurns((prev) => [...prev, { id: nextId(), role: "user", text: question }])
    setBusy(true)
    try {
      const reply = await askConcierge(question)
      setTurns((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "ai",
          text: reply.answer || (reply.enabled ? "" : "KIZ-AI isn't switched on yet."),
          reply,
        },
      ])
    } catch {
      setTurns((prev) => [
        ...prev,
        { id: nextId(), role: "ai", text: "Sorry, I couldn't reach the server. Try again in a moment." },
      ])
    } finally {
      setBusy(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
    }
  }

  return (
    <Screen padded={false} edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          <Box flexDirection="row" alignItems="center" gap="s">
            <Box
              width={40}
              height={40}
              borderRadius="pill"
              backgroundColor="brand50"
              alignItems="center"
              justifyContent="center"
            >
              <Icon name="smart_toy" size={22} color={theme.colors.brand600} />
            </Box>
            <Box>
              <Text variant="subheading">KIZ-AI</Text>
              <Text variant="caption">Your KIZ concierge</Text>
            </Box>
          </Box>

          {turns.map((turn) =>
            turn.role === "user" ? (
              <Box key={turn.id} alignItems="flex-end">
                <Box
                  maxWidth="82%"
                  paddingHorizontal="m"
                  paddingVertical="s"
                  borderRadius="card"
                  backgroundColor="brand600"
                >
                  <Text variant="body" style={{ color: "#FFFFFF" }}>
                    {turn.text}
                  </Text>
                </Box>
              </Box>
            ) : (
              <AssistantBubble key={turn.id} turn={turn} />
            )
          )}

          {busy ? (
            <Box flexDirection="row" alignItems="center" gap="s">
              <Icon name="smart_toy" size={16} color={theme.colors.ink300} />
              <Text variant="caption">KIZ-AI is thinking…</Text>
            </Box>
          ) : null}
        </ScrollView>

        <Box
          flexDirection="row"
          alignItems="flex-end"
          gap="s"
          paddingHorizontal="l"
          paddingVertical="s"
          borderTopWidth={1}
          borderTopColor="border"
        >
          <Box flex={1} borderWidth={1} borderColor="borderStrong" borderRadius="input" paddingHorizontal="m">
            <TextInput
              style={{ minHeight: 44, maxHeight: 120, fontSize: 15, color: theme.colors.ink900 }}
              value={input}
              onChangeText={setInput}
              placeholder="Ask KIZ-AI…"
              placeholderTextColor={theme.colors.ink300}
              multiline
            />
          </Box>
          <Pressable
            onPress={send}
            disabled={!input.trim() || busy}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: input.trim() ? theme.colors.brand600 : theme.colors.border,
            }}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function AssistantBubble({ turn }: { turn: Turn }) {
  const theme = useTheme<Theme>()
  const reply = turn.reply
  const needsOffice = reply && (reply.kind === "unknown" || (!reply.enabled && turn.text.length > 0))

  return (
    <Box flexDirection="row" gap="s" alignItems="flex-start">
      <Box
        width={32}
        height={32}
        borderRadius="pill"
        backgroundColor="brand50"
        alignItems="center"
        justifyContent="center"
      >
        <Icon name="smart_toy" size={18} color={theme.colors.brand600} />
      </Box>

      <Box flex={1} minWidth={0} gap="s">
        {turn.text ? (
          <Surface>
            <Text variant="body">{turn.text}</Text>
          </Surface>
        ) : null}

        {reply?.sources && reply.sources.length > 0 ? (
          <Box flexDirection="row" flexWrap="wrap" gap="s">
            {reply.sources.map((s, i) => (
              <Pressable
                key={`${s.title}-${i}`}
                onPress={() => {
                  const url = absoluteUrl(s.href)
                  if (url) void WebBrowser.openBrowserAsync(url).catch(() => {})
                }}
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  borderRadius="pill"
                  borderWidth={1}
                  borderColor="brand300"
                  backgroundColor="brand50"
                >
                  <Icon name="link" size={13} color={theme.colors.brand700} />
                  <Text variant="caption" style={{ color: theme.colors.brand700 }}>
                    {s.title}
                  </Text>
                </Box>
              </Pressable>
            ))}
          </Box>
        ) : null}

        {needsOffice ? (
          <Surface>
            <Text variant="bodyStrong">Let&apos;s get the office to help</Text>
            <Text variant="caption" marginTop="xs">
              {reply?.officeOpen
                ? "The KIZ office is open now — start a live chat and they'll answer."
                : "The KIZ office is closed right now, but leave a ticket and they'll get back to you."}
            </Text>
            <Box marginTop="m">
              <KButton
                label="Ask the KIZ office"
                icon="support_agent"
                variant="secondary"
                onPress={() => router.push("/helpdesk")}
              />
            </Box>
          </Surface>
        ) : null}
      </Box>
    </Box>
  )
}

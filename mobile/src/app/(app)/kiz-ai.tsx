import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@shopify/restyle"
import * as WebBrowser from "expo-web-browser"
import { router } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, TextInput } from "react-native"

import { absoluteUrl } from "@/lib/config"
import { AI_STARTERS, demoAiAnswer, useDemo } from "@/lib/demo"
import { notifyError, tapLight } from "@/lib/feedback"
import { askConcierge, useConciergeMeta } from "@/lib/hooks"
import type { ConciergeReply } from "@/lib/types"
import {
  AiBadge,
  Box,
  FadeInUp,
  KButton,
  KIconButton,
  KPill,
  PressScale,
  Screen,
  Shimmer,
  Surface,
  Text,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

/**
 * KIZ-AI concierge.
 *
 * Three changes that decide whether this feature gets used at all:
 *
 * 1. **Starter chips.** The screen used to open with a greeting and an empty
 *    input — the hardest possible start, and the reason a first-time user (or a
 *    judge with 10 seconds) bounces. Tappable example questions remove the
 *    "what can I even ask?" problem entirely.
 * 2. **Persisted history.** State was local `useState`, so the conversation was
 *    wiped on every navigation away. Now cached in AsyncStorage.
 * 3. **Demo fallback.** With Demo Mode on, keyword-matched answers are served
 *    locally, so the AI still demonstrates with no backend.
 */

const HISTORY_KEY = "kiz.ai.history"
const MAX_PERSISTED = 40

interface Turn {
  id: string
  role: "user" | "ai"
  text: string
  reply?: ConciergeReply
}

const GREETING_ID = "greeting"

function greetingFor(name: string): string {
  return `Hi! I'm ${name}. Ask me anything about life at Kolej Ibu Zain — rooms, facilities, laundry, helpdesk, check-in and payments.`
}

let seq = 0
function nextId(): string {
  seq += 1
  return `t${Date.now()}_${seq}`
}

export default function KizAiScreen() {
  const theme = useTheme<Theme>()
  const scrollRef = useRef<ScrollView>(null)
  const { demo } = useDemo()
  const { data: meta } = useConciergeMeta()

  // The concierge is renamed in the admin panel (e.g. "Kizzy"). Fall back to the
  // default label only until the meta request resolves.
  const aiName = meta?.name ?? "KIZ-AI"

  // The greeting is *not* persisted — it is rendered fresh from `aiName`, so an
  // admin rename can never leave a stale "Hi, I'm KIZ-AI" greeting behind.
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState(false)

  // Restore the previous conversation (user/assistant turns only).
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as Turn[]
          if (Array.isArray(parsed) && parsed.length > 0) setTurns(parsed)
        }
      })
      .catch(() => {})
      .finally(() => setRestored(true))
  }, [])

  // Persist on change (only meaningful once there is something beyond a greeting).
  useEffect(() => {
    if (!restored || turns.length === 0) return
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(turns.slice(-MAX_PERSISTED))).catch(() => {})
  }, [turns, restored])

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || busy) return

      setInput("")
      setTurns((prev) => [...prev, { id: nextId(), role: "user", text: trimmed }])
      setBusy(true)

      try {
        if (demo) {
          await new Promise((r) => setTimeout(r, 700))
          setTurns((prev) => [...prev, { id: nextId(), role: "ai", text: demoAiAnswer(trimmed) }])
          return
        }

        const reply = await askConcierge(trimmed)
        setTurns((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "ai",
            text: reply.answer || (reply.enabled ? "" : `${aiName} isn't switched on yet.`),
            reply,
          },
        ])
      } catch {
        notifyError()
        // Offline: fall back to the local knowledge base rather than a dead end.
        setTurns((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "ai",
            text: `I couldn't reach the server, so here's what I know offline:\n\n${demoAiAnswer(trimmed)}`,
          },
        ])
      } finally {
        setBusy(false)
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60)
      }
    },
    [busy, demo, aiName]
  )

  const clearHistory = useCallback(() => {
    setTurns([])
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {})
    tapLight()
  }, [])

  const showStarters = turns.length === 0 && !busy

  return (
    <Screen padded={false} edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
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
            <Box flex={1}>
              <Box flexDirection="row" alignItems="center" gap="s">
                <Text variant="subheading">{aiName}</Text>
                <AiBadge label={demo ? "DEMO" : "AI"} />
              </Box>
              <Text variant="caption">Your KIZ concierge</Text>
            </Box>
            {turns.length > 1 ? (
              <KIconButton icon="history" label="Clear conversation" onPress={clearHistory} />
            ) : null}
          </Box>

          {/*
            Greeting is rendered from the live name, not stored — see the note
            above. Rendered as a plain assistant bubble with no reply payload.
          */}
          <AssistantBubble turn={{ id: GREETING_ID, role: "ai", text: greetingFor(aiName) }} />

          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <FadeInUp key={turn.id} index={Math.min(i, 2)}>
                <Box alignItems="flex-end">
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
              </FadeInUp>
            ) : (
              <AssistantBubble key={turn.id} turn={turn} />
            )
          )}

          {busy ? <ThinkingBubble /> : null}

          {/* Starter prompts — the fastest path from "opened" to "used". */}
          {showStarters ? (
            <FadeInUp index={1}>
              <Box marginTop="s" gap="s">
                <Text variant="label">TRY ASKING</Text>
                <Box flexDirection="row" flexWrap="wrap" gap="s">
                  {AI_STARTERS.map((prompt) => (
                    <KPill key={prompt} label={prompt} onPress={() => void ask(prompt)} />
                  ))}
                </Box>
              </Box>
            </FadeInUp>
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
              accessibilityLabel="Your question for KIZ-AI"
            />
          </Box>
          <PressScale
            onPress={() => void ask(input)}
            disabled={!input.trim() || busy}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Send question"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: input.trim() && !busy ? theme.colors.brand600 : theme.colors.border,
            }}
          >
            <Icon name="send" size={20} color="#FFFFFF" />
          </PressScale>
        </Box>
      </KeyboardAvoidingView>
    </Screen>
  )
}

/** Animated three-dot "thinking" state — replaces a static text line. */
function ThinkingBubble() {
  const theme = useTheme<Theme>()
  return (
    <Box flexDirection="row" gap="s" alignItems="center">
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
      <Shimmer>
        <Box
          flexDirection="row"
          alignItems="center"
          gap="xs"
          paddingHorizontal="m"
          paddingVertical="s"
          borderRadius="card"
          backgroundColor="canvasSunk"
        >
          {[0, 1, 2].map((i) => (
            <Box key={i} width={6} height={6} borderRadius="pill" backgroundColor="ink300" />
          ))}
          <Text variant="caption" marginLeft="xs">
            Thinking…
          </Text>
        </Box>
      </Shimmer>
    </Box>
  )
}

function AssistantBubble({ turn }: { turn: Turn }) {
  const theme = useTheme<Theme>()
  const reply = turn.reply
  const needsOffice = reply && (reply.kind === "unknown" || (!reply.enabled && turn.text.length > 0))

  return (
    <FadeInUp>
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
            <Box gap="xs">
              <Text variant="label">SOURCES</Text>
              <Box flexDirection="row" flexWrap="wrap" gap="s">
                {reply.sources.map((s, i) => (
                  <PressScale
                    key={`${s.title}-${i}`}
                    onPress={() => {
                      const url = absoluteUrl(s.href)
                      if (url) void WebBrowser.openBrowserAsync(url).catch(() => {})
                    }}
                    accessibilityRole="link"
                    accessibilityLabel={`Open source: ${s.title}`}
                  >
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      gap="xs"
                      paddingHorizontal="m"
                      minHeight={36}
                      justifyContent="center"
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
                  </PressScale>
                ))}
              </Box>
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
    </FadeInUp>
  )
}

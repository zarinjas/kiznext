"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius, glass, gradient } from "@/lib/theme"
import { askConcierge, escalateToOffice } from "@/app/(dashboard)/[role]/concierge-actions"
import type { ConciergeEmotion, ConciergeFrames } from "@/lib/ai/config"

interface Source {
  title: string
  href: string | null
}

interface Msg {
  id: string
  from: "user" | "ai"
  text: string
  sources?: Source[]
  confident?: boolean
  escalateQuestion?: string
  officeOpen?: boolean
}

const SUGGESTIONS = [
  "What are the office hours?",
  "How do I book Dewan Sutera?",
  "Bila saya boleh pilih bilik?",
  "How do I report a lost item?",
]

/** Frame-loop speed per emotion (ms between frames). */
const EMOTION_INTERVAL: Record<ConciergeEmotion, number> = {
  idle: 520,
  thinking: 240,
  happy: 300,
}

let seq = 0
const nextId = () => `m${Date.now()}-${seq++}`

/**
 * RobotSprite — crossfades a set of frames on a loop. Falls back to a single
 * static image, then to the sparkle icon, so it always renders something.
 */
function RobotSprite({
  frames,
  fallback,
  size,
  intervalMs,
  sx,
}: {
  frames: string[]
  fallback: string | null
  size: number
  intervalMs?: number
  sx?: Record<string, unknown>
}) {
  const list = frames.filter(Boolean)
  const shown = list.length > 0 ? list : fallback ? [fallback] : []
  const key = shown.join("|")
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (shown.length < 2 || !intervalMs) return
    const t = setInterval(() => setIdx((i) => (i + 1) % shown.length), intervalMs)
    return () => clearInterval(t)
  }, [key, intervalMs, shown.length])

  const active = shown.length > 0 ? idx % shown.length : 0

  return (
    <Box sx={{ position: "relative", width: size, height: size, overflow: "hidden", flexShrink: 0, ...sx }}>
      {shown.length === 0 ? (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <KIcon icon="smart_toy" size={size * 0.55} sx={{ color: color.brand[600] }} />
        </Box>
      ) : (
        shown.map((src, i) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt=""
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: i === active ? 1 : 0,
              transition: "opacity 120ms linear",
            }}
          />
        ))
      )}
    </Box>
  )
}

function TypingDots() {
  return (
    <Box sx={{ display: "inline-flex", gap: 0.5, alignItems: "center", py: 0.5 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "text.disabled",
            animation: "kizai-blink 1.2s infinite",
            animationDelay: `${i * 0.18}s`,
            "@keyframes kizai-blink": {
              "0%, 80%, 100%": { opacity: 0.25, transform: "translateY(0)" },
              "40%": { opacity: 1, transform: "translateY(-2px)" },
            },
          }}
        />
      ))}
    </Box>
  )
}

export function KizAi({
  role,
  name,
  avatarUrl,
  frames,
  enabled,
}: {
  role: string
  name: string
  avatarUrl: string | null
  frames: ConciergeFrames
  enabled: boolean
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [escalating, setEscalating] = useState<string | null>(null)
  const [emotion, setEmotion] = useState<ConciergeEmotion>("idle")
  const scrollRef = useRef<HTMLDivElement>(null)
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("kiz-ai:open", onOpen)
    return () => window.removeEventListener("kiz-ai:open", onOpen)
  }, [])

  useEffect(() => {
    return () => {
      if (moodTimer.current) clearTimeout(moodTimer.current)
    }
  }, [])

  if (!enabled) return null

  /** Show "happy" briefly, then settle back to idle. */
  function flashHappy() {
    setEmotion("happy")
    if (moodTimer.current) clearTimeout(moodTimer.current)
    moodTimer.current = setTimeout(() => setEmotion("idle"), 2400)
  }

  const staticAvatar = frames.idle.filter(Boolean)[0] ?? avatarUrl

  async function send(question: string) {
    const q = question.trim()
    if (!q || loading) return
    setInput("")
    setMessages((m) => [...m, { id: nextId(), from: "user", text: q }])
    setLoading(true)
    setEmotion("thinking")
    try {
      const res = await askConcierge(q)
      if (!res.enabled) {
        setMessages((m) => [
          ...m,
          { id: nextId(), from: "ai", text: "KIZ-AI isn't switched on yet. Please contact the KIZ office.", confident: false, escalateQuestion: q },
        ])
        setEmotion("idle")
      } else if (res.confident) {
        setMessages((m) => [
          ...m,
          { id: nextId(), from: "ai", text: res.answer, confident: true, sources: res.sources },
        ])
        flashHappy()
      } else {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            from: "ai",
            text: res.error
              ? "Sorry, I couldn't reach my brain just now. You can still send this to the KIZ office."
              : "I'm not sure about that one — I don't want to guess. Want me to pass it to the KIZ office?",
            confident: false,
            escalateQuestion: q,
            officeOpen: res.officeOpen,
          },
        ])
        setEmotion("idle")
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId(), from: "ai", text: "Something went wrong on my side. Please try again.", confident: false, escalateQuestion: q },
      ])
      setEmotion("idle")
    } finally {
      setLoading(false)
    }
  }

  async function escalate(msg: Msg) {
    if (!msg.escalateQuestion) return
    setEscalating(msg.id)
    try {
      const { ticketId } = await escalateToOffice({ question: msg.escalateQuestion })
      setOpen(false)
      flashHappy()
      router.push(`/${role}/helpdesk/${ticketId}`)
    } catch {
      setEscalating(null)
    }
  }

  const sourceHref = (href: string | null) => (href ? `/${role}/${href}` : `/${role}`)

  const panel = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          background: gradient.hero,
        }}
      >
        <RobotSprite
          key={emotion}
          frames={frames[emotion]}
          fallback={avatarUrl}
          size={38}
          intervalMs={EMOTION_INTERVAL[emotion]}
          sx={{ borderRadius: `${radius.input}px`, border: "1px solid", borderColor: "divider", backgroundColor: color.canvasSunk }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 650, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
            {name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color.success.main }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              KIZ knowledge assistant
            </Typography>
          </Box>
        </Box>
        {messages.length > 0 && (
          <Box
            component="button"
            aria-label="New chat"
            onClick={() => setMessages([])}
            sx={{ border: "none", background: "transparent", cursor: "pointer", color: "text.disabled", display: "flex", p: 0.5, "&:hover": { color: "text.primary" } }}
          >
            <KIcon icon="restart_alt" size={20} />
          </Box>
        )}
        <Box
          component="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          sx={{ border: "none", background: "transparent", cursor: "pointer", color: "text.secondary", display: "flex", p: 0.5, "&:hover": { color: "text.primary" } }}
        >
          <KIcon icon="close" size={20} />
        </Box>
      </Box>

      {/* Messages */}
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", px: 2, py: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
        {messages.length === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1.25 }}>
              <RobotSprite frames={[]} fallback={staticAvatar} size={32} sx={{ borderRadius: `${radius.input}px`, border: "1px solid", borderColor: "divider" }} />
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: `${radius.card}px`,
                  borderTopLeftRadius: 4,
                  backgroundColor: "action.hover",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Hi! I&apos;m {name}. Ask me anything about KIZ — office hours, bookings, rooms, or lost items.
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, pl: 5.5 }}>
              {SUGGESTIONS.map((s) => (
                <Box
                  key={s}
                  component="button"
                  onClick={() => send(s)}
                  sx={{
                    px: 1.25,
                    py: 0.625,
                    borderRadius: "999px",
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                    color: "text.secondary",
                    fontSize: 12.5,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    "&:hover": { borderColor: color.brand[400], color: color.brand[700] },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {messages.map((m) =>
          m.from === "user" ? (
            <Box key={m.id} sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Box
                sx={{
                  maxWidth: "82%",
                  px: 1.5,
                  py: 1,
                  borderRadius: `${radius.card}px`,
                  borderBottomRightRadius: 4,
                  backgroundColor: color.brand[600],
                  color: "#fff",
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </Box>
            </Box>
          ) : (
            <Box key={m.id} sx={{ display: "flex", gap: 1.25 }}>
              <RobotSprite frames={[]} fallback={staticAvatar} size={32} sx={{ borderRadius: `${radius.input}px`, border: "1px solid", borderColor: "divider" }} />
              <Box sx={{ maxWidth: "82%", minWidth: 0 }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: `${radius.card}px`,
                    borderTopLeftRadius: 4,
                    backgroundColor: "action.hover",
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.text}
                </Box>

                {m.confident && m.sources && m.sources.length > 0 && (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.75 }}>
                    {m.sources.map((s, i) => (
                      <Box
                        key={i}
                        component="a"
                        href={sourceHref(s.href)}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.375,
                          px: 1,
                          py: 0.375,
                          borderRadius: "999px",
                          backgroundColor: color.brand[50],
                          color: color.brand[700],
                          fontSize: 11.5,
                          fontWeight: 600,
                          textDecoration: "none",
                          maxWidth: "100%",
                        }}
                      >
                        <KIcon icon="link" size={13} />
                        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.title}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {m.confident === false && m.escalateQuestion && (
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.25,
                      borderRadius: `${radius.card}px`,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                      {m.officeOpen
                        ? "The KIZ office is open now — you can chat with them live."
                        : "The office is closed right now — send it as a ticket and they'll reply when it reopens."}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Box
                        component="button"
                        disabled={escalating === m.id}
                        onClick={() => escalate(m)}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.625,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: `${radius.input}px`,
                          border: "none",
                          backgroundColor: color.brand[600],
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          opacity: escalating === m.id ? 0.7 : 1,
                        }}
                      >
                        <KIcon icon="support_agent" size={16} />
                        {escalating === m.id ? "Sending…" : m.officeOpen ? "Chat with the office" : "Send to the office"}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          ),
        )}

        {loading && (
          <Box sx={{ display: "flex", gap: 1.25 }}>
            <RobotSprite frames={frames.thinking} fallback={avatarUrl} size={32} intervalMs={EMOTION_INTERVAL.thinking} sx={{ borderRadius: `${radius.input}px`, border: "1px solid", borderColor: "divider" }} />
            <Box sx={{ px: 1.5, py: 1, borderRadius: `${radius.card}px`, borderTopLeftRadius: 4, backgroundColor: "action.hover" }}>
              <TypingDots />
            </Box>
          </Box>
        )}
      </Box>

      {/* Composer */}
      <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, alignItems: "flex-end" }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder={`Ask ${name}…`}
          size="small"
        />
        <Box
          component="button"
          aria-label="Send"
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: "50%",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: input.trim() ? color.brand[600] : color.canvasSunk,
            color: input.trim() ? "#fff" : "text.disabled",
            cursor: input.trim() ? "pointer" : "default",
            transition: "background-color 140ms",
          }}
        >
          <KIcon icon="arrow_upward" size={19} />
        </Box>
      </Box>
    </Box>
  )

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <Box
          component={motion.button}
          aria-label={`Open ${name}`}
          onClick={() => setOpen(true)}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          sx={{
            position: "fixed",
            right: { xs: 16, md: 24 },
            bottom: { xs: "calc(56px + env(safe-area-inset-bottom) + 16px)", md: 24 },
            zIndex: 25,
            width: 60,
            height: 60,
            p: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            filter: "drop-shadow(0 8px 16px rgba(9,9,11,0.22))",
          }}
        >
          <RobotSprite key={emotion} frames={frames[emotion]} fallback={avatarUrl} size={60} intervalMs={EMOTION_INTERVAL[emotion]} />
          <Box
            sx={{
              position: "absolute",
              top: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: color.success.main,
              border: "2px solid",
              borderColor: "background.paper",
            }}
          />
        </Box>
      )}

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={() => setOpen(false)}
          slotProps={{
            paper: {
              sx: {
                borderTopLeftRadius: `${radius.sheet}px`,
                borderTopRightRadius: `${radius.sheet}px`,
                height: "86dvh",
                overflow: "hidden",
              },
            },
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
            <Box sx={{ width: 40, height: 5, borderRadius: 999, backgroundColor: "divider" }} />
          </Box>
          <Box sx={{ flex: 1, minHeight: 0 }}>{panel}</Box>
        </Drawer>
      ) : (
        <Drawer
          anchor="right"
          open={open}
          onClose={() => setOpen(false)}
          slotProps={{
            paper: {
              sx: {
                width: "min(420px, 92vw)",
                borderLeft: "1px solid",
                borderColor: "divider",
                background: glass.background,
              },
            },
          }}
        >
          {panel}
        </Drawer>
      )}
    </>
  )
}

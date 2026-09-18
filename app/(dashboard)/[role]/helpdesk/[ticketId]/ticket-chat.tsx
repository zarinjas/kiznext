"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Tooltip from "@mui/material/Tooltip"
import { sendReply, closeTicket, getTicketMessages } from "../actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { messageVersions } from "@/lib/helpdesk-meta"
import { chatRoleBadge } from "@/lib/chat-meta"
import { SUPPORT_ROLES } from "@/lib/rbac"

const IMAGE_URL_RE = /https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i
const STAFF_ROLES = SUPPORT_ROLES as string[]

function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role)
}

/** Default the reader to Mandarin only when the resident actually writes it. */
function initialViewerLang(messages: Message[]): "en" | "zh" {
  const first = messages.find((m) => m.sourceLang && !isStaffRole(m.sender.role))
  return first?.sourceLang === "zh" ? "zh" : "en"
}

function renderMessage(msg: string) {
  if (IMAGE_URL_RE.test(msg.trim())) {
    return (
      <Box
        component="img"
        src={msg.trim()}
        alt=""
        loading="lazy"
        sx={{ maxWidth: "100%", borderRadius: `${radius.input}px`, display: "block" }}
      />
    )
  }
  return <span>{msg}</span>
}

interface Message {
  id: string
  message: string
  isAutoReply: boolean
  sourceLang?: string | null
  translationEn?: string | null
  translationZh?: string | null
  createdAt: Date
  sender: { name: string; role: string }
}

interface Props {
  ticketId: string
  ticketStatus: string
  channel: string
  messages: Message[]
  role: string
}

/** TicketChat — helpdesk conversation, styled from the shared chat recipe. */
export function TicketChat({ ticketId, ticketStatus, channel, messages: initialMessages, role }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [lang, setLang] = useState<"en" | "zh">(() => initialViewerLang(initialMessages))
  const picked = useRef(false)
  const endRef = useRef<HTMLDivElement>(null)

  const isClosed = ticketStatus === "closed"
  const isAdmin = isStaffRole(role)
  const canTranslate = channel === "live" && messages.some((m) => messageVersions(m).translated)

  // The opening message is translated just after it's sent, so the first render
  // may not know the resident writes Mandarin yet — switch to 中文 once it does,
  // unless they've already chosen a language themselves.
  useEffect(() => {
    if (!picked.current && initialViewerLang(messages) === "zh") setLang("zh")
  }, [messages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isClosed) return
    const interval = setInterval(async () => {
      try {
        const updated = await getTicketMessages(ticketId)
        setMessages(updated as unknown as Message[])
      } catch {
        // ignore polling errors
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [ticketId, isClosed])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendReply(ticketId, text.trim())
      setText("")
      const updated = await getTicketMessages(ticketId)
      setMessages(updated as unknown as Message[])
      router.refresh()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: { xs: "calc(100dvh - 200px)", md: 560 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: `${radius.card}px`,
        overflow: "hidden",
        backgroundColor: "background.paper",
      }}
    >
      {isClosed && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.neutral.soft, fontSize: 12.5, color: "text.secondary", fontWeight: 600 }}>
          This ticket is closed.
        </Box>
      )}
      {ticketStatus === "resolved" && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.success.soft, fontSize: 12.5, color: color.success.ink, fontWeight: 600 }}>
          Marked as resolved — reply below to reopen it if anything&apos;s still not right.
        </Box>
      )}

      {/* Live-chat translation switcher */}
      {canTranslate && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            backgroundColor: color.info.soft,
          }}
        >
          <Typography
            variant="caption"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: color.info.ink, fontWeight: 600 }}
          >
            <KIcon icon="translate" size={14} />
            Auto-translated
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              borderRadius: `${radius.pill}px`,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              backgroundColor: "background.paper",
            }}
          >
            {(["en", "zh"] as const).map((l) => (
              <Box
                key={l}
                component="button"
                onClick={() => {
                  picked.current = true
                  setLang(l)
                }}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: lang === l ? color.brand[600] : "transparent",
                  color: lang === l ? "#fff" : "text.secondary",
                }}
              >
                {l === "en" ? "English" : "中文"}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, "&::-webkit-scrollbar": { width: 6 } }}>
        {messages.map((msg) => {
          const mine = msg.sender.role === role
          const time = new Date(msg.createdAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })
          const badge = chatRoleBadge(msg.sender.role)
          const isImage = IMAGE_URL_RE.test(msg.message.trim())
          const versions = messageVersions(msg)
          const body = isImage ? msg.message : lang === "zh" ? versions.zh : versions.en

          if (msg.isAutoReply) {
            return (
              <Box key={msg.id} sx={{ display: "flex", justifyContent: "center" }}>
                <Box
                  sx={{
                    maxWidth: { xs: "88%", sm: "62%" },
                    px: 1.5,
                    py: 1,
                    borderRadius: `${radius.input}px`,
                    backgroundColor: "action.hover",
                    color: "text.secondary",
                    fontSize: 13,
                    fontStyle: "italic",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    textAlign: "center",
                  }}
                >
                  {renderMessage(msg.message)}
                </Box>
              </Box>
            )
          }

          return (
            <Box key={msg.id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 1 }}>
              <Box sx={{ maxWidth: { xs: "80%", sm: "70%" }, minWidth: 0 }}>
                {!mine && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {msg.sender.name}
                    </Typography>
                    <Box
                      component="span"
                      sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        px: 0.625,
                        py: 0.125,
                        borderRadius: `${radius.pill}px`,
                        backgroundColor: badge.tone.soft,
                        color: badge.tone.ink,
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {badge.label}
                    </Box>
                  </Box>
                )}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    backgroundColor: mine ? color.brand[900] : "action.hover",
                    color: mine ? "#fff" : "text.primary",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {renderMessage(body)}
                </Box>
                {versions.translated && !isImage && body !== msg.message && (
                  <Typography variant="caption" sx={{ display: "block", px: 0.5, mt: 0.25, color: "text.disabled", textAlign: mine ? "right" : "left" }}>
                    {lang === "zh" ? "Translated to 中文" : "Translated to English"}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ display: "block", px: 0.5, mt: 0.25, color: "text.disabled", textAlign: mine ? "right" : "left" }}>
                  {time}
                </Typography>
              </Box>
            </Box>
          )
        })}
        <div ref={endRef} />
      </Box>

      {!isClosed && (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, backgroundColor: "background.paper" }}>
          <Box
            component="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type a message…"
            disabled={sending}
            sx={{
              flex: 1,
              minHeight: 42,
              px: 1.75,
              borderRadius: 999,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.default",
              fontSize: 14,
              outline: "none",
              "&:focus": { borderColor: color.brand[400], boxShadow: `0 0 0 3px ${color.brand[100]}` },
              color: "text.primary",
            }}
          />
          <Tooltip title="Send">
            <Box
              component="button"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              sx={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backgroundColor: color.brand[600],
                color: "#fff",
                "&:hover": { backgroundColor: color.brand[700] },
                "&:disabled": { backgroundColor: "action.disabledBackground", color: "text.disabled", cursor: "default" },
              }}
            >
              <KIcon icon="send" size={18} />
            </Box>
          </Tooltip>
        </Box>
      )}

      {!isClosed && !isAdmin && (
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 2, py: 1 }}>
          <Box
            component="button"
            onClick={async () => {
              await closeTicket(ticketId)
              router.refresh()
            }}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              minHeight: 40,
              px: 1,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "text.secondary",
              fontWeight: 600,
              borderRadius: `${radius.button}px`,
              "&:hover": { color: "error.main", backgroundColor: "action.hover" },
            }}
          >
            <KIcon icon="close" size={16} />
            Close Ticket
          </Box>
        </Box>
      )}
    </Box>
  )
}

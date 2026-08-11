"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Tooltip from "@mui/material/Tooltip"
import { sendReply, closeTicket, getTicketMessages } from "../actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

const IMAGE_URL_RE = /https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i

function renderMessage(msg: string) {
  if (IMAGE_URL_RE.test(msg.trim())) {
    return (
      <Box
        component="img"
        src={msg.trim()}
        alt=""
        loading="lazy"
        sx={{ maxWidth: "100%", borderRadius: 1.5, display: "block" }}
      />
    )
  }
  return <span>{msg}</span>
}

interface Message {
  id: string
  message: string
  isAutoReply: boolean
  createdAt: Date
  sender: { name: string; role: string }
}

interface Props {
  ticketId: string
  ticketStatus: string
  messages: Message[]
  role: string
}

export function TicketChat({ ticketId, ticketStatus, messages: initialMessages, role }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const isClosed = ticketStatus === "closed"
  const isAdmin = role === "admin_kiz" || role === "superadmin"

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
        borderRadius: 3,
        overflow: "hidden",
        backgroundColor: "background.paper",
      }}
    >
      {isClosed && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.neutral.soft, fontSize: 12.5, color: "text.secondary", fontWeight: 600 }}>
          This ticket is closed.
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1, "&::-webkit-scrollbar": { width: 6 } }}>
        {messages.map((msg) => {
          const mine = msg.sender.role === role
          return (
            <Box key={msg.id} sx={{ display: "flex", justifyContent: msg.isAutoReply ? "center" : mine ? "flex-end" : "flex-start" }}>
              <Box
                sx={{
                  maxWidth: { xs: "85%", sm: "72%" },
                  px: 1.5,
                  py: 1,
                  borderRadius: msg.isAutoReply ? 2 : mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  backgroundColor: msg.isAutoReply
                    ? "action.hover"
                    : mine
                    ? color.brand[900]
                    : color.info.soft,
                  color: msg.isAutoReply
                    ? "text.secondary"
                    : mine
                    ? "#fff"
                    : color.info.ink,
                  fontSize: 13.5,
                  fontStyle: msg.isAutoReply ? "italic" : "normal",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {!msg.isAutoReply && (
                  <Typography variant="caption" sx={{ display: "block", mb: 0.25, opacity: 0.75, fontWeight: 600 }}>
                    {msg.sender.name}
                  </Typography>
                )}
                {renderMessage(msg.message)}
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
              borderRadius: 99,
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
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 1.5, py: 1 }}>
          <Box
            component="button"
            onClick={async () => {
              await closeTicket(ticketId)
              router.refresh()
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 12.5,
              color: "text.secondary",
              fontWeight: 600,
              "&:hover": { color: "error.main" },
            }}
          >
            <KIcon icon="close" size={14} />
            Close Ticket
          </Box>
        </Box>
      )}
    </Box>
  )
}

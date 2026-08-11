"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { adminReply, assignTicket, closeTicketAdmin } from "../actions"
import { getTicketMessages } from "../../helpdesk/actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

const ADMIN_IMAGE_URL_RE = /https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i

function adminRenderMessage(msg: string) {
  if (ADMIN_IMAGE_URL_RE.test(msg.trim())) {
    return <Box component="img" src={msg.trim()} alt="" loading="lazy" sx={{ maxWidth: "100%", borderRadius: 1.5, display: "block" }} />
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

export function AdminTicketChat({ ticketId, ticketStatus, messages: initialMessages, role: _role }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const isClosed = ticketStatus === "closed"
  const canAssign = ticketStatus === "open"

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
      await adminReply(ticketId, text.trim())
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
    <Box sx={{ display: "flex", flexDirection: "column", height: { xs: "calc(100dvh - 220px)", md: 540 }, border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden", backgroundColor: "background.paper" }}>
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1, "&::-webkit-scrollbar": { width: 6 } }}>
        {messages.map((msg) => {
          const isStaff = msg.sender.role === "admin_kiz" || msg.sender.role === "superadmin"
          return (
            <Box key={msg.id} sx={{ display: "flex", justifyContent: msg.isAutoReply ? "center" : isStaff ? "flex-end" : "flex-start" }}>
              <Box
                sx={{
                  maxWidth: { xs: "85%", sm: "72%" },
                  px: 1.5,
                  py: 1,
                  borderRadius: msg.isAutoReply ? 2 : isStaff ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  backgroundColor: msg.isAutoReply ? "action.hover" : isStaff ? color.brand[900] : color.info.soft,
                  color: msg.isAutoReply ? "text.secondary" : isStaff ? "#fff" : color.info.ink,
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
                {adminRenderMessage(msg.message)}
              </Box>
            </Box>
          )
        })}
        <div ref={endRef} />
      </Box>

      {!isClosed && (
        <Box sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          {canAssign && (
            <Box sx={{ mb: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  await assignTicket(ticketId)
                  router.refresh()
                }}
                startIcon={<KIcon icon="assignment_ind" size={15} />}
              >
                Take This Ticket
              </Button>
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
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
              placeholder="Type your reply…"
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
            <Button variant="contained" onClick={handleSend} disabled={sending || !text.trim()} sx={{ minHeight: 42, borderRadius: 99 }}>
              <KIcon icon="send" size={17} />
            </Button>
          </Box>
        </Box>
      )}

      {!isClosed && (
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 1.5, py: 1 }}>
          <Button
            size="small"
            onClick={async () => {
              await closeTicketAdmin(ticketId)
              router.refresh()
            }}
            sx={{ color: "text.secondary" }}
            startIcon={<KIcon icon="close" size={14} />}
          >
            Close Ticket
          </Button>
        </Box>
      )}
    </Box>
  )
}

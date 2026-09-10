"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import {
  adminReply,
  assignTicket,
  resolveTicketAdmin,
  requestMoreInfo,
  closeTicketAdmin,
  reopenTicketAdmin,
} from "../actions"
import { getTicketMessages } from "../../helpdesk/actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { isHelpdeskActive } from "@/lib/helpdesk-meta"

const ADMIN_IMAGE_URL_RE = /https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i

function adminRenderMessage(msg: string) {
  if (ADMIN_IMAGE_URL_RE.test(msg.trim())) {
    return <Box component="img" src={msg.trim()} alt="" loading="lazy" sx={{ maxWidth: "100%", borderRadius: `${radius.input}px`, display: "block" }} />
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

/** AdminTicketChat — helpdesk thread for staff, styled from the shared chat recipe. */
export function AdminTicketChat({ ticketId, ticketStatus, messages: initialMessages, role: _role }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const status = ticketStatus
  const isClosed = status === "closed"
  const active = isHelpdeskActive(status)
  const canCompose = active && !sending
  const isResolved = status === "resolved"
  const awaitingInfo = status === "more_info_required"

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
    if (!text.trim() || !canCompose) return
    setSending(true)
    try {
      await adminReply(ticketId, text.trim())
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

  async function runAction(action: () => Promise<void>) {
    try {
      await action()
      const updated = await getTicketMessages(ticketId)
      setMessages(updated as unknown as Message[])
      router.refresh()
    } catch {
      // ignore
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: { xs: "calc(100dvh - 240px)", md: 540 }, border: "1px solid", borderColor: "divider", borderRadius: `${radius.card}px`, overflow: "hidden", backgroundColor: "background.paper" }}>
      {isClosed && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.neutral.soft, fontSize: 12.5, color: "text.secondary", fontWeight: 600 }}>
          This ticket is closed.
        </Box>
      )}
      {isResolved && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.success.soft, fontSize: 12.5, color: color.success.ink, fontWeight: 600 }}>
          Resolved — reopen it if the issue comes back.
        </Box>
      )}
      {awaitingInfo && (
        <Box sx={{ px: 2, py: 1, textAlign: "center", backgroundColor: color.warning.soft, fontSize: 12.5, color: color.warning.ink, fontWeight: 600 }}>
          Waiting for more information from the reporter.
        </Box>
      )}

      {/* Status actions */}
      {!isClosed && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
          {status === "submitted" || status === "under_review" ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => runAction(() => assignTicket(ticketId))}
              startIcon={<KIcon icon="assignment_ind" size={15} />}
            >
              Take this ticket
            </Button>
          ) : null}
          {active && !awaitingInfo ? (
            <Button
              size="small"
              onClick={() => runAction(() => requestMoreInfo(ticketId))}
              startIcon={<KIcon icon="more_horiz" size={15} />}
            >
              Ask for more info
            </Button>
          ) : null}
          {active ? (
            <Button
              size="small"
              color="success"
              onClick={() => runAction(() => resolveTicketAdmin(ticketId))}
              startIcon={<KIcon icon="check_circle" size={15} />}
            >
              Mark resolved
            </Button>
          ) : null}
          {isResolved && (
            <Button
              size="small"
              onClick={() => runAction(() => reopenTicketAdmin(ticketId))}
              startIcon={<KIcon icon="replay" size={15} />}
            >
              Reopen
            </Button>
          )}
          {!isClosed && (
            <Button
              size="small"
              sx={{ color: "text.secondary" }}
              onClick={() => runAction(() => closeTicketAdmin(ticketId))}
              startIcon={<KIcon icon="close" size={15} />}
            >
              Close
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, "&::-webkit-scrollbar": { width: 6 } }}>
        {messages.map((msg) => {
          const isStaff = msg.sender.role === "admin_kiz" || msg.sender.role === "superadmin"
          const time = new Date(msg.createdAt).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })

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
                  {adminRenderMessage(msg.message)}
                </Box>
              </Box>
            )
          }

          return (
            <Box key={msg.id} sx={{ display: "flex", justifyContent: isStaff ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 1 }}>
              <Box sx={{ maxWidth: { xs: "80%", sm: "70%" }, minWidth: 0 }}>
                {!isStaff && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {msg.sender.name}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: isStaff ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    backgroundColor: isStaff ? color.brand[900] : "action.hover",
                    color: isStaff ? "#fff" : "text.primary",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {adminRenderMessage(msg.message)}
                </Box>
                <Typography variant="caption" sx={{ display: "block", px: 0.5, mt: 0.25, color: "text.disabled", textAlign: isStaff ? "right" : "left" }}>
                  {time}
                </Typography>
              </Box>
            </Box>
          )
        })}
        <div ref={endRef} />
      </Box>

      {canCompose && (
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
            placeholder="Type your reply…"
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
    </Box>
  )
}

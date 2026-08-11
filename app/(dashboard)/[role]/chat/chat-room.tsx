"use client"

import { useState, useEffect, useRef } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { sendChatMessage, deleteChatMessage, getChatMessages } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface ChatMsg {
  id: string
  message: string
  createdAt: Date
  user: { id: string; name: string; role: string }
}

interface Props {
  initialMessages: ChatMsg[]
  role: string
  userId: string
}

export function ChatRoom({ initialMessages, role, userId }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const isAdmin = role === "admin_kiz" || role === "superadmin"

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const updated = await getChatMessages()
        setMessages(updated as unknown as ChatMsg[])
      } catch {
        // ignore
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendChatMessage(text.trim())
      setText("")
      const updated = await getChatMessages()
      setMessages(updated as unknown as ChatMsg[])
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
        height: { xs: "calc(100dvh - 180px)", md: "calc(100dvh - 160px)" },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        backgroundColor: "background.paper",
        maxWidth: 820,
        mx: "auto",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>Community Chat</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            One shared room for all KIZ residents
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color.success.main }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>Live · 3s</Typography>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "divider", borderRadius: 3 },
        }}
      >
        {messages.map((msg) => {
          const mine = msg.user.id === userId
          const staff = msg.user.role !== "ahli"
          return (
            <Box
              key={msg.id}
              sx={{
                display: "flex",
                justifyContent: mine ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 1,
              }}
            >
              {isAdmin && !mine && (
                <Tooltip title="Delete message">
                  <IconButton
                    size="small"
                    onClick={() => deleteChatMessage(msg.id)}
                    sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                  >
                    <KIcon icon="delete" size={15} />
                  </IconButton>
                </Tooltip>
              )}
              <Box sx={{ maxWidth: { xs: "82%", sm: "70%" } }}>
                {!mine && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 0.5, mb: 0.25 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                      {msg.user.name}
                    </Typography>
                    {staff && (
                      <Box
                        component="span"
                        sx={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: color.brand[700],
                          backgroundColor: color.brand[50],
                          borderRadius: 999,
                          px: 0.75,
                          py: 0.15,
                        }}
                      >
                        Staff
                      </Box>
                    )}
                  </Box>
                )}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.9,
                    borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    backgroundColor: mine ? color.brand[900] : "action.hover",
                    color: mine ? "#fff" : "text.primary",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.message}
                </Box>
                <Typography variant="caption" sx={{ display: "block", px: 0.5, mt: 0.25, color: "text.disabled", textAlign: mine ? "right" : "left" }}>
                  {new Date(msg.createdAt).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                </Typography>
              </Box>
            </Box>
          )
        })}
        <div ref={endRef} />
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
          backgroundColor: "background.paper",
        }}
      >
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
    </Box>
  )
}

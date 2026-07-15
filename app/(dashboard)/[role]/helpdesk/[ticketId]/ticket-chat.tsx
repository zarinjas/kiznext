"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { sendReply, closeTicket, getTicketMessages } from "../actions"
import { Bot, Send, XCircle } from "lucide-react"

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
  compact?: boolean
}

export function TicketChat({ ticketId, ticketStatus, messages: initialMessages, role, compact = false }: Props) {
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
    <div className={compact ? "flex h-full flex-col rounded-2xl border border-border bg-card" : "flex flex-col rounded-lg border bg-card"}>
      <div className={compact ? "flex-1 space-y-3 overflow-y-auto p-3" : "flex-1 space-y-3 overflow-y-auto p-4 max-h-[60vh]"}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isAutoReply ? "justify-center" : msg.sender.role === role ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                msg.isAutoReply
                  ? "bg-muted text-center text-xs text-muted-foreground italic"
                  : msg.sender.role === role
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {!msg.isAutoReply && (
                <p className="mb-1 text-xs opacity-70">{msg.sender.name}</p>
              )}
              <p>{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {!isClosed && (
        <div className={compact ? "border-t border-border p-3" : "border-t p-4"}>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Taip mesej..."
              className={compact ? "flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm" : "flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"}
              disabled={sending}
            />
            <Button size="icon" className={compact ? "rounded-full" : ""} onClick={handleSend} disabled={sending || !text.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {!isClosed && !isAdmin && (
        <div className={compact ? "border-t border-border px-3 py-2" : "border-t px-4 py-2"}>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={async () => {
              await closeTicket(ticketId)
              router.refresh()
            }}
          >
            <XCircle className="mr-1 size-3" />
            Tutup Ticket
          </Button>
        </div>
      )}
    </div>
  )
}

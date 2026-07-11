"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { adminReply, assignTicket, closeTicketAdmin } from "../actions"
import { getTicketMessages } from "../../helpdesk/actions"
import { Send, XCircle } from "lucide-react"

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

export function AdminTicketChat({ ticketId, ticketStatus, messages: initialMessages, role }: Props) {
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
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[60vh]">
        {messages.map((msg) => {
          const isStaff = msg.sender.role === "admin_kiz" || msg.sender.role === "superadmin"
          return (
            <div
              key={msg.id}
              className={`flex ${msg.isAutoReply ? "justify-center" : isStaff ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  msg.isAutoReply
                    ? "bg-muted text-center text-xs text-muted-foreground italic"
                    : isStaff
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
          )
        })}
        <div ref={endRef} />
      </div>

      {!isClosed && (
        <div className="border-t p-4">
          {canAssign && (
            <div className="mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await assignTicket(ticketId)
                  router.refresh()
                }}
              >
                Ambil Ticket Ini
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Taip balasan..."
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              disabled={sending}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {!isClosed && (
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={async () => {
              await closeTicketAdmin(ticketId)
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

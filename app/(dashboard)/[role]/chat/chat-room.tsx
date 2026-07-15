"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { sendChatMessage, deleteChatMessage, getChatMessages } from "./actions"
import { Send, Trash2 } from "lucide-react"

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
  compact?: boolean
}

export function ChatRoom({ initialMessages, role, userId, compact = false }: Props) {
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

  if (compact) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((msg) => {
            const mine = msg.user.id === userId
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  {!mine && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-xs font-medium text-foreground">{msg.user.name}</span>
                      {msg.user.role !== "ahli" && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] text-primary-foreground">
                          Staff
                        </span>
                      )}
                    </div>
                  )}
                  <div className={`mt-0.5 flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.message}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => deleteChatMessage(msg.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        title="Padam"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                  <span className={`mt-0.5 block px-1 text-[10px] text-muted-foreground ${mine ? "text-right" : ""}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("ms-MY", {
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Taip mesej..."
              className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm"
              disabled={sending}
            />
            <Button size="icon" className="rounded-full" onClick={handleSend} disabled={sending || !text.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[65vh]">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{msg.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleTimeString("ms-MY", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                {msg.user.role !== "ahli" && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary-foreground">
                    Staff
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-foreground">{msg.message}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => deleteChatMessage(msg.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                title="Padam"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Taip mesej..."
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            disabled={sending}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

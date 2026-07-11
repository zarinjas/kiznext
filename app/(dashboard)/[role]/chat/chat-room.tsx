"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { sendChatMessage, deleteChatMessage, getChatMessages } from "./actions"
import { Send, Trash2 } from "lucide-react"

interface ChatMsg {
  id: string
  message: string
  createdAt: Date
  user: { name: string; role: string }
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

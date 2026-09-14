"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import { startLiveChat } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { color, radius } from "@/lib/theme"

/**
 * Live chat entry — a quick question to the office, no category form. Creates a
 * `live` helpdesk thread and opens it.
 */
export function LiveChatForm({ role, officeOpen }: { role: string; officeOpen: boolean }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!message.trim()) {
      setError("Type your question first.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const ticketId = await startLiveChat(message)
      router.push(`/${role}/helpdesk/${ticketId}`)
    } catch {
      setError("Couldn't start the chat — try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          label="Ask a quick question"
          placeholder={officeOpen ? "e.g. Is the office open today?" : "e.g. How do I get a replacement key?"}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            setError("")
          }}
          multiline
          minRows={2}
          fullWidth
          sx={{
            "& .MuiOutlinedInput-root": { borderRadius: `${radius.input}px` },
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {officeOpen
              ? "We're online — a real person will jump in."
              : "We're closed now, but your message is saved and we'll reply when we reopen."}
          </Typography>
          <KButton type="submit" loading={loading} icon="forum">
            {loading ? "Starting…" : "Start chat"}
          </KButton>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: 1.25,
            borderRadius: `${radius.input}px`,
            backgroundColor: color.info.soft,
            color: color.info.ink,
          }}
        >
          <Box component="span" sx={{ fontSize: 13, lineHeight: 1.5 }}>
            Need to request something formal (room change, repairs, an application)? Use a{" "}
            <Box component="span" sx={{ fontWeight: 700 }}>
              Support Ticket
            </Box>{" "}
            below so it can be tracked.
          </Box>
        </Box>
      </Box>
    </form>
  )
}

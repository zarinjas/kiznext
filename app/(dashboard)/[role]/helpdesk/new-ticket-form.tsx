"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"

import Alert from "@mui/material/Alert"
import { createTicket } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"

interface Props {
  role: string
}

export function NewTicketForm({ role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const subject = form.get("subject") as string
    const message = form.get("message") as string

    if (!subject || !message) {
      setError("Please fill all required fields")
      setLoading(false)
      return
    }

    try {
      const ticketId = await createTicket(subject, message)
      router.push(`/${role}/helpdesk/${ticketId}`)
    } catch {
      setError("Oops, something went sideways. Give it another try.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          id="subject"
          name="subject"
          label="Title"
          placeholder="Example: WiFi problem at Block A"
          required
        />
        <TextField
          id="message"
          name="message"
          label="Message"
          placeholder="Describe your issue or question…"
          multiline
          minRows={4}
          required
        />
        {error && <Alert severity="error">{error}</Alert>}
        <KButton type="submit" loading={loading} icon="send">
          {loading ? "Sending…" : "Submit"}
        </KButton>
      </Box>
    </form>
  )
}

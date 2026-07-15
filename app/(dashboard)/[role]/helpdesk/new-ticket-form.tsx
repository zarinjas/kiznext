"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createTicket } from "./actions"

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
      setError("Sila isi semua ruangan")
      setLoading(false)
      return
    }

    try {
      const ticketId = await createTicket(subject, message)
      router.push(`/${role}/helpdesk/${ticketId}`)
    } catch {
      setError("Ralat berlaku. Sila cuba lagi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject">Tajuk</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="Contoh: Masalah WiFi di Blok A"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Mesej</Label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          placeholder="Huraikan masalah atau pertanyaan anda..."
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Menghantar..." : "Hantar"}
      </Button>
    </form>
  )
}

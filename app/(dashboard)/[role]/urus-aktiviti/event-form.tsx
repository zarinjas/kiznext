"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { createEvent, updateEvent, type EventInput } from "@/lib/events"
import { KButton } from "@/components/kiz/primitives/k-button"

interface EventView {
  id: string
  title: string
  description: string | null
  venue: string | null
  startsAt: string
}

interface Props {
  initial?: EventView | null
  onClose?: () => void
}

/** Convert a stored UTC instant into the KL "datetime-local" input value. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso))
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour === "24" ? "00" : value.hour}:${value.minute}`
}

export function EventForm({ initial, onClose }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)

  const [title, setTitle] = useState(initial?.title ?? "")
  const [venue, setVenue] = useState(initial?.venue ?? "")
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt))
  const [description, setDescription] = useState(initial?.description ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    if (!title.trim()) {
      setError("Give the activity a title.")
      setLoading(false)
      return
    }
    if (!startsAt) {
      setError("Pick a start date and time.")
      setLoading(false)
      return
    }
    const data: EventInput = {
      title,
      venue,
      description,
      startsAt: new Date(startsAt).toISOString(),
    }
    try {
      if (isEditing && initial) {
        await updateEvent(initial.id, data)
      } else {
        await createEvent(data)
      }
      router.refresh()
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. KIZ Community Clean-Up" size="medium" required />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Start date & time" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} size="medium" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Dewan Sutera" size="medium" />
      </Box>
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="medium" multiline minRows={2} placeholder="Optional — what's this activity about?" />
      {error && (
        <Typography variant="caption" sx={{ color: "error.main" }}>
          {error}
        </Typography>
      )}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <KButton loading={loading} icon={isEditing ? "save" : "add"} onClick={handleSubmit}>
          {isEditing ? "Save Changes" : "Add Activity"}
        </KButton>
      </Box>
    </Box>
  )
}

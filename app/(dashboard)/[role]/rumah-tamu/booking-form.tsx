"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"

import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { createGHBooking } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { color } from "@/lib/theme"

interface Props {
  role: string
}

export function GHBookingForm({ role }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const form = new FormData(e.currentTarget)

    try {
      await createGHBooking(form)
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            mx: "auto",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.success.soft,
            color: color.success.ink,
          }}
        >
          <KIcon icon="check_circle" size={28} />
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>Booking submitted!</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>Pending admin approval.</Typography>
        <Button sx={{ mt: 2.5 }} variant="contained" onClick={() => router.push(`/${role}/rumah-tamu`)}>
          Back
        </Button>
      </Box>
    )
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="guestName" name="guestName" label="Guest Name" placeholder="Full name of guest" required />
        <TextField id="periodType" name="periodType" label="Booking Type" select required defaultValue="daily">
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
        </TextField>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField id="startDate" name="startDate" label="Start Date" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }} required />
          <TextField id="endDate" name="endDate" label="End Date" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }} required />
        </Box>
        <TextField
          id="notes"
          name="notes"
          label="Notes (optional)"
          multiline
          minRows={3}
          placeholder="Example: guest will arrive at 3 PM…"
        />
        {error && <Alert severity="error">{error}</Alert>}
        <KButton type="submit" loading={loading} icon="hotel">
          {loading ? "Processing…" : "Submit Booking"}
        </KButton>
      </Box>
    </form>
  )
}

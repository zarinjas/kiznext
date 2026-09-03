"use client"

import { useEffect, useState } from "react"
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
  guestHouseId: string
  guestHouseName: string
  price?: number | null
}

export function GHBookingForm({ role, guestHouseId, guestHouseName, price }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // min date is applied after mount so the SSR HTML and the first client render
  // agree (avoids a hydration mismatch on the `min` attribute near midnight).
  const [minDate, setMinDate] = useState("")
  useEffect(() => {
    const id = window.setTimeout(() => {
      const t = new Date()
      t.setDate(t.getDate() + 1)
      setMinDate(t.toISOString().split("T")[0])
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

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
      setError(err instanceof Error ? err.message : "Oops, something went sideways — try again.")
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
        <Typography variant="body1" sx={{ fontWeight: 600 }}>Yay! Booking sent 🎉</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>Admin&rsquo;s giving it a look — pending approval.</Typography>
        <Button sx={{ mt: 2.5 }} variant="contained" onClick={() => router.push(`/${role}/rumah-tamu`)}>
          Back
        </Button>
      </Box>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="guestHouseId" value={guestHouseId} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            borderRadius: 2,
            backgroundColor: "action.hover",
            px: 1.5,
            py: 1.25,
            fontSize: 13,
          }}
        >
          <KIcon icon="hotel" size={17} sx={{ color: "text.secondary" }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="span" sx={{ fontWeight: 600 }}>{guestHouseName}</Typography>
            {price != null && (
              <Typography component="span" sx={{ color: "text.secondary" }}>
                {" "}· RM {price.toFixed(2)} / night
              </Typography>
            )}
          </Box>
        </Box>
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

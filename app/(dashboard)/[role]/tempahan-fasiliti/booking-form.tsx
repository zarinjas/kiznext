"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"

import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import { createFacilityBooking } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KButton } from "@/components/kiz/primitives/k-button"
import { color } from "@/lib/theme"

interface Facility {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  block: { name: string }
  bookings: { timeSlotStart: Date; timeSlotEnd: Date }[]
}

interface Props {
  facility: Facility
  role: string
}

export function BookingForm({ facility, role }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<"detail" | "form" | "done">("detail")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [bookingRef, setBookingRef] = useState("")

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    form.set("facilityId", facility.id)

    try {
      const ref = await createFacilityBooking(form)
      setBookingRef(ref)
      setStep("done")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <Box sx={{ textAlign: "center", py: 5 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            mx: "auto",
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.success.soft,
            color: color.success.ink,
          }}
        >
          <KIcon icon="check_circle" size={32} />
        </Box>
        <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif" }}>Booking Submitted!</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
          Reference No.: <Box component="span" sx={{ fontFamily: "var(--font-mono), monospace", fontWeight: 700 }}>{bookingRef}</Box>
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
          Your booking is pending admin approval.
        </Typography>
        <Button sx={{ mt: 3 }} variant="contained" onClick={() => router.push(`/${role}/tempahan-fasiliti`)}>
          Back to facilities
        </Button>
      </Box>
    )
  }

  if (step === "form") {
    return (
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>Book: {facility.name}</Typography>
            <Button size="small" onClick={() => setStep("detail")}>Back</Button>
          </Box>

          <TextField
            id="date"
            name="date"
            label="Date"
            type="date"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }}
            required
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField id="timeStart" name="timeStart" label="Start Time" type="time" slotProps={{ inputLabel: { shrink: true } }} required />
            <TextField id="timeEnd" name="timeEnd" label="End Time" type="time" slotProps={{ inputLabel: { shrink: true } }} required />
          </Box>
          <TextField id="purpose" name="purpose" label="Purpose" select required defaultValue="">
            <MenuItem value="" disabled>Select purpose…</MenuItem>
            <MenuItem value="Meeting">Meeting</MenuItem>
            <MenuItem value="Program">Program</MenuItem>
            <MenuItem value="Recreation">Recreation</MenuItem>
            <MenuItem value="Study/Group">Study / Group</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
          <TextField
            id="notes"
            name="notes"
            label="Notes (optional)"
            multiline
            minRows={2}
            placeholder="e.g. need projector, 20 people…"
          />

          {error && <Alert severity="error">{error}</Alert>}
          <KButton type="submit" loading={loading} icon="event_available">
            {loading ? "Processing…" : "Submit Booking"}
          </KButton>
        </Box>
      </form>
    )
  }

  const bookedDates = facility.bookings.map((b) => ({
    start: new Date(b.timeSlotStart),
    end: new Date(b.timeSlotEnd),
  }))

  return (
    <Box>
      {facility.featuredImage && (
        <Box component="img" src={facility.featuredImage} alt={facility.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 2.5, mb: 2 }} />
      )}
      {facility.gallery.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1, mb: 2 }}>
          {facility.gallery.map((url, i) => (
            <Box key={i} component="img" src={url} alt="" sx={{ width: 80, height: 80, objectFit: "cover", borderRadius: 1.5, flexShrink: 0 }} />
          ))}
        </Box>
      )}

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h2" sx={{ fontFamily: "var(--font-sans), sans-serif" }}>{facility.name}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>{facility.description}</Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
            <KIcon icon="location_on" size={15} />
            <Typography variant="body2">{facility.block.name}</Typography>
          </Box>
          {facility.capacity && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
              <KIcon icon="group" size={15} />
              <Typography variant="body2">{facility.capacity} people</Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <KIcon icon="payments" size={15} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: facility.price ? "primary.main" : "success.main" }}>
              {facility.price ? `RM ${facility.price.toFixed(2)}` : "Free"}
            </Typography>
          </Box>
        </Box>

        {bookedDates.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Existing bookings: {bookedDates.length}</Typography>
            <Typography variant="caption">Please check availability before booking.</Typography>
          </Alert>
        )}
      </Box>

      <FormSection title="Ready to book?" subtitle="You'll get a booking reference and a PDF slip." icon="event_available">
        <KButton onClick={() => setStep("form")} icon="calendar_month" sx={{ width: { xs: "100%", sm: "auto" } }}>
          Book Now
        </KButton>
      </FormSection>
    </Box>
  )
}

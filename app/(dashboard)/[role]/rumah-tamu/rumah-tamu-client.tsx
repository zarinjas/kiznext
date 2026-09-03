"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { AvailabilityCalendar } from "@/components/shared/availability-calendar"
import { GHBookingForm } from "./booking-form"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"

interface GuestHouseOption {
  id: string
  name: string
  description: string
  price: number | null
  capacity: number | null
  maxDays: number | null
  requiresApproval: boolean
}

interface BookingRange {
  id: string
  guestName: string
  startDate: Date
  endDate: Date
}

interface Props {
  role: string
  guestHouses: GuestHouseOption[]
  activeBookings: (BookingRange & { guestHouseId: string })[]
}

function formatPrice(price: number | null): string {
  if (price == null) return "Free"
  return `RM ${price.toFixed(2)}`
}

export function RumahTamuClient({ role, guestHouses, activeBookings }: Props) {
  const [selectedId, setSelectedId] = useState(guestHouses[0]?.id ?? "")

  const selected = guestHouses.find((g) => g.id === selectedId) ?? guestHouses[0] ?? null
  const currentId = selected?.id ?? ""
  const filteredBookings = activeBookings.filter((b) => b.guestHouseId === currentId)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <FormSection
        title="Choose Guest House"
        subtitle="Availability is per guest house — pick one first."
        icon="hotel"
      >
        {guestHouses.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 3, color: "text.secondary", fontSize: 14 }}>
            No guest houses available right now. Check back soon.
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {guestHouses.map((g) => {
              const active = g.id === currentId
              return (
                <Box
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(g.id)
                  }}
                  aria-pressed={active}
                  sx={{
                    flex: "1 1 200px",
                    cursor: "pointer",
                    borderRadius: `${radius.cardLg}px`,
                    border: "1.5px solid",
                    borderColor: active ? color.brand[600] : "divider",
                    backgroundColor: active ? color.brand[50] : "background.paper",
                    p: 2,
                    transition: "border-color 140ms, background-color 140ms",
                    "&:hover": { borderColor: active ? color.brand[600] : color.brand[300] },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <KIcon icon="hotel" size={17} sx={{ color: active ? color.brand[700] : "text.secondary" }} />
                    <Typography sx={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.011em" }}>
                      {g.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                    {g.description}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", fontSize: 12, color: "text.secondary" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <KIcon icon="payments" size={13} /> {formatPrice(g.price)}
                    </Box>
                    {g.capacity && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <KIcon icon="group" size={13} /> {g.capacity} pax
                      </Box>
                    )}
                    {g.maxDays && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <KIcon icon="schedule" size={13} /> {g.maxDays} days max
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </FormSection>

      <FormSection title="Availability" subtitle="See booked dates for this guest house." icon="calendar_month">
        <AvailabilityCalendar bookings={filteredBookings} />
      </FormSection>

      <FormSection title="New Booking" subtitle="Daily, weekly or monthly stays." icon="hotel">
        {selected ? (
          <GHBookingForm role={role} guestHouseId={selected.id} guestHouseName={selected.name} price={selected.price} />
        ) : (
          <Box sx={{ textAlign: "center", py: 3, color: "text.secondary", fontSize: 14 }}>
            A guest house must be configured before you can book.
          </Box>
        )}
      </FormSection>
    </Box>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { GHBookingForm } from "./booking-form"
import { AvailabilityCalendar } from "@/components/shared/availability-calendar"
import { CancelGHButton } from "@/components/shared/cancel-gh-button"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"

export default async function RumahTamuPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const bookings = await prisma.guestHouseBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  const activeBookings = await prisma.guestHouseBooking.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
    },
    select: {
      id: true,
      guestName: true,
      startDate: true,
      endDate: true,
    },
  })

  const isAhli = session.user.role === "ahli"

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <PageHeader
        overline="Bookings"
        title="Guest House"
        subtitle="Book accommodation for guests, alumni, or family."
      />

      <FormSection title="Availability" subtitle="See booked dates before you submit." icon="calendar_month">
        <AvailabilityCalendar bookings={activeBookings} />
      </FormSection>

      <FormSection title="New Booking" subtitle="Daily, weekly or monthly stays." icon="hotel">
        <GHBookingForm role={session.user.role} />
      </FormSection>

      {bookings.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5 }}>
            Your Bookings
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {bookings.map((b) => (
              <Box
                key={b.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.75,
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "action.hover",
                    color: "primary.main",
                    flexShrink: 0,
                  }}
                >
                  <KIcon icon="hotel" size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.guestName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")}
                  </Typography>
                </Box>
                <StatusChip status={b.status} />
                {b.status === "pending" && isAhli && <CancelGHButton bookingId={b.id} />}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

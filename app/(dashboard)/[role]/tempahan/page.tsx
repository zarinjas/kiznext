import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { font } from "@/lib/theme"

export default async function MyBookingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = session.user.role

  const [facilityBookings, guestHouseBookings] = await Promise.all([
    prisma.facilityBooking.findMany({
      where: { userId: session.user.id, deletedAt: null },
      include: { facility: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guestHouseBooking.findMany({
      where: { userId: session.user.id, deletedAt: null },
      include: { guestHouse: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const total = facilityBookings.length + guestHouseBookings.length

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Bookings"
        title="My bookings"
        actions={
          <>
            <Button
              component={Link}
              href={`/${role}/tempahan-fasiliti`}
              variant="contained"
              startIcon={<KIcon icon="meeting_room" size={18} />}
            >
              Book a facility
            </Button>
            <Button
              component={Link}
              href={`/${role}/rumah-tamu`}
              variant="outlined"
              startIcon={<KIcon icon="hotel" size={18} />}
            >
              Guest house
            </Button>
          </>
        }
      />

      {total === 0 ? (
        <KEmpty
          icon="calendar_month"
          title="Nothing booked yet"
          body="Book a facility or the guest house and it'll show up here."
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {facilityBookings.length > 0 && (
            <ListGroup title={`Facilities · ${facilityBookings.length}`}>
              {facilityBookings.map((b) => (
                <ListRow
                  key={b.id}
                  icon="meeting_room"
                  title={b.facility.name}
                  subtitle={
                    <>
                      {b.timeSlotStart.toLocaleDateString("en-MY", { day: "numeric", month: "short" })} ·{" "}
                      {b.timeSlotStart.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}–
                      {b.timeSlotEnd.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                      {b.bookingRef && (
                        <>
                          {" · "}
                          <Box component="span" sx={{ fontFamily: font.mono }}>
                            {b.bookingRef}
                          </Box>
                        </>
                      )}
                    </>
                  }
                  trailing={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusChip status={b.status} />
                      {b.pdfUrl && (
                        <Box
                          component="a"
                          href={b.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Booking slip (PDF)"
                          sx={{
                            color: "text.disabled",
                            display: "flex",
                            "&:hover": { color: "text.primary" },
                          }}
                        >
                          <KIcon icon="description" size={18} />
                        </Box>
                      )}
                    </Box>
                  }
                />
              ))}
            </ListGroup>
          )}

          {guestHouseBookings.length > 0 && (
            <ListGroup title={`Guest house · ${guestHouseBookings.length}`}>
              {guestHouseBookings.map((b) => (
                <ListRow
                  key={b.id}
                  icon="hotel"
                  title={b.guestName}
                  subtitle={
                    <>
                      {b.guestHouse.name} ·{" "}
                      {b.startDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" })} –{" "}
                      {b.endDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" })} · {b.periodType}
                    </>
                  }
                  trailing={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <StatusChip status={b.status} />
                      <Box sx={{ display: { xs: "none", sm: "flex" } }}>
                        <StatusChip status={b.paymentStatus} tone="info" />
                      </Box>
                    </Box>
                  }
                />
              ))}
            </ListGroup>
          )}
        </Box>
      )}
    </Box>
  )
}

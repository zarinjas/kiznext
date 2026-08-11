import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, elevation } from "@/lib/theme"

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
      orderBy: { createdAt: "desc" },
    }),
  ])

  const total = facilityBookings.length + guestHouseBookings.length

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <PageHeader
        overline="Bookings"
        title="My Bookings"
        subtitle="Every facility and guest house booking, in one timeline."
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
          title="No bookings yet"
          body="Book a facility or the guest house to see it here."
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {facilityBookings.length > 0 && (
            <Box>
              <Typography variant="overline" sx={{ color: "text.disabled", mb: 1, display: "block" }}>
                Facilities · {facilityBookings.length}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {facilityBookings.map((b) => (
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
                      boxShadow: elevation.e1,
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
                        backgroundColor: color.brand[50],
                        color: color.brand[700],
                        flexShrink: 0,
                      }}
                    >
                      <KIcon icon="meeting_room" size={20} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {b.facility.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                        {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {b.timeSlotEnd.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                        {b.bookingRef && <> · <Box component="span" sx={{ fontFamily: "var(--font-mono), monospace" }}>{b.bookingRef}</Box></>}
                      </Typography>
                    </Box>
                    <StatusChip status={b.status} />
                    {b.pdfUrl && (
                      <Box
                        component="a"
                        href={b.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Booking slip (PDF)"
                        sx={{ color: "text.secondary", display: "flex", "&:hover": { color: color.brand[700] } }}
                      >
                        <KIcon icon="description" size={18} />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {guestHouseBookings.length > 0 && (
            <Box>
              <Typography variant="overline" sx={{ color: "text.disabled", mb: 1, display: "block" }}>
                Guest House · {guestHouseBookings.length}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {guestHouseBookings.map((b) => (
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
                      boxShadow: elevation.e1,
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
                        backgroundColor: color.info.soft,
                        color: color.info.ink,
                        flexShrink: 0,
                      }}
                    >
                      <KIcon icon="hotel" size={20} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {b.guestName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")} ·{" "}
                        {b.periodType}
                      </Typography>
                    </Box>
                    <StatusChip status={b.status} />
                    <StatusChip status={b.paymentStatus} tone="info" />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

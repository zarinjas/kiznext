import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { RumahTamuClient } from "./rumah-tamu-client"
import { CancelGHButton } from "@/components/shared/cancel-gh-button"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"

export default async function RumahTamuPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [bookings, activeBookings, guestHouses] = await Promise.all([
    prisma.guestHouseBooking.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.guestHouseBooking.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ["rejected", "cancelled"] },
      },
      select: {
        id: true,
        guestHouseId: true,
        guestName: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.guestHouse.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: "asc" }],
    }),
  ])

  const isAhli = session.user.role === "ahli"

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <PageHeader
        overline="Bookings"
        title="Guest House"
        subtitle="Book accommodation for guests, alumni, or family."
      />

      <RumahTamuClient
        role={session.user.role}
        guestHouses={guestHouses.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          price: g.price,
          capacity: g.capacity,
          maxDays: g.maxDays,
          requiresApproval: g.requiresApproval,
        }))}
        activeBookings={activeBookings.map((b) => ({
          id: b.id,
          guestHouseId: b.guestHouseId,
          guestName: b.guestName,
          startDate: b.startDate,
          endDate: b.endDate,
        }))}
      />

      {bookings.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <ListGroup title="Your bookings">
            {bookings.map((b) => (
              <ListRow
                key={b.id}
                icon="hotel"
                title={b.guestName}
                subtitle={`${b.startDate.toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                })} – ${b.endDate.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}`}
                trailing={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <StatusChip status={b.status} />
                    {b.status === "pending" && isAhli && <CancelGHButton bookingId={b.id} />}
                  </Box>
                }
              />
            ))}
          </ListGroup>
        </Box>
      )}
    </Box>
  )
}

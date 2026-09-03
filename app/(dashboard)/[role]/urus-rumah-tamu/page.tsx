import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { GHManageButtons } from "./manage-buttons"
import { RumahTamuTabs } from "./tabs"
import { GuestHouseList } from "./guest-house-list"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { radius } from "@/lib/theme"

export default async function UrusRumahTamuPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const { tab } = await searchParams
  const showGuestHouses = tab === "guest-houses"

  // Guest Houses tab — configure the bookable guest houses themselves.
  if (showGuestHouses) {
    const guestHouses = await prisma.guestHouse.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    })

    return (
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <PageHeader
          overline="Admin"
          title="Guest House"
          subtitle="Approve bookings, and add or edit the guest houses students can book."
        />
        <RumahTamuTabs role={session.user.role} tab={tab} />
        <GuestHouseList
          guestHouses={guestHouses.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            featuredImage: g.featuredImage,
            gallery: g.gallery,
            price: g.price,
            capacity: g.capacity,
            maxDays: g.maxDays,
            requiresApproval: g.requiresApproval,
          }))}
        />
      </Box>
    )
  }

  // Bookings tab — approval flow.
  const bookings = await prisma.guestHouseBooking.findMany({
    where: { deletedAt: null },
    include: { user: true, guestHouse: true },
    orderBy: { createdAt: "desc" },
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => ["approved", "checked_in"].includes(b.status))
  const done = bookings.filter((b) => ["rejected", "checked_out", "cancelled"].includes(b.status))

  const dateRange = (a: Date, b: Date) =>
    `${a.toLocaleDateString("en-MY", { day: "numeric", month: "short" })} – ${b.toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
    })}`

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Guest House"
        subtitle={
          pending.length > 0
            ? `${pending.length} booking${pending.length === 1 ? "" : "s"} awaiting approval.`
            : "Approve bookings, manage check-in/out, and mark payments."
        }
      />
      <RumahTamuTabs role={session.user.role} tab={tab} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Pending — detail cards */}
        {pending.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
              Awaiting approval · {pending.length}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {pending.map((b) => (
                <Box
                  key={b.id}
                  sx={{
                    borderRadius: `${radius.cardLg}px`,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                    p: { xs: 2, sm: 2.5 },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>
                        {b.guestName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {b.guestHouse.name} · requested by {b.user.name} · {b.user.matricId}
                      </Typography>
                    </Box>
                    <StatusChip status={b.paymentStatus} />
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))" },
                      gap: 1.25,
                      p: 1.75,
                      mb: 2,
                      borderRadius: 2.5,
                      backgroundColor: "action.hover",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
                        Dates
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {dateRange(b.startDate, b.endDate)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
                        Period
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {b.periodType}
                      </Typography>
                    </Box>
                    {b.notes && (
                      <Box sx={{ gridColumn: { sm: "span 2" } }}>
                        <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
                          Notes
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {b.notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <GHManageButtons bookingId={b.id} status={b.status} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Active */}
        {active.length > 0 && (
          <ListGroup title={`Active · ${active.length}`}>
            {active.map((b) => (
              <ListRow
                key={b.id}
                icon="hotel"
                title={b.guestName}
                subtitle={`${b.guestHouse.name} · ${b.user.name} · ${dateRange(b.startDate, b.endDate)}`}
                trailing={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <StatusChip status={b.status} />
                    <Box sx={{ display: { xs: "none", md: "flex" } }}>
                      <StatusChip status={b.paymentStatus} />
                    </Box>
                    <GHManageButtons bookingId={b.id} status={b.status} />
                  </Box>
                }
              />
            ))}
          </ListGroup>
        )}

        {pending.length === 0 && active.length === 0 && (
          <KEmpty icon="hotel" title="Quiet for now" body="New guest house bookings will show up here." />
        )}

        {/* History */}
        {done.length > 0 && (
          <ListGroup title={`History · ${done.length}`}>
            {done.map((b) => (
              <ListRow
                key={b.id}
                icon="history"
                title={b.guestName}
                subtitle={`${b.guestHouse.name} · ${b.user.name}`}
                trailing={<StatusChip status={b.status} />}
              />
            ))}
          </ListGroup>
        )}
      </Box>
    </Box>
  )
}

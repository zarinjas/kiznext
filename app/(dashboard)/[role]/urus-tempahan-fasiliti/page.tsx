import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { ApproveRejectButtons } from "./approve-reject-buttons"
import { approveFacility, rejectFacility } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { font, radius } from "@/lib/theme"

export default async function UrusTempahanFasilitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const bookings = await prisma.facilityBooking.findMany({
    where: { deletedAt: null },
    include: {
      facility: { select: { name: true, price: true } },
      user: { select: { name: true, matricId: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => b.status === "approved")
  const done = bookings.filter((b) => ["rejected", "cancelled"].includes(b.status))

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Approval center"
        subtitle={
          pending.length > 0
            ? `${pending.length} booking${pending.length === 1 ? "" : "s"} awaiting your approval.`
            : "Approve or reject facility bookings."
        }
      />

      {/* Pending — full detail cards, the primary work surface */}
      {pending.length > 0 && (
        <Box sx={{ mb: 4 }}>
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
                {/* Title row */}
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>
                      {b.facility.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {b.user.name} · {b.user.matricId}
                    </Typography>
                  </Box>
                  {b.bookingRef && (
                    <Typography
                      variant="caption"
                      sx={{ color: "text.disabled", fontFamily: font.mono, flexShrink: 0 }}
                    >
                      {b.bookingRef}
                    </Typography>
                  )}
                </Box>

                {/* Detail grid */}
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
                  <Detail label="Date">
                    {b.timeSlotStart.toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Detail>
                  <Detail label="Time">
                    {b.timeSlotStart.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {b.timeSlotEnd.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                  </Detail>
                  {b.purpose && <Detail label="Purpose">{b.purpose}</Detail>}
                  {b.notes && <Detail label="Notes">{b.notes}</Detail>}
                </Box>

                {/* Actions */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  {b.pdfUrl ? (
                    <Box
                      component="a"
                      href={b.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontSize: 13,
                        fontWeight: 550,
                        color: "text.secondary",
                        textDecoration: "none",
                        "&:hover": { color: "text.primary" },
                      }}
                    >
                      <KIcon icon="description" size={16} /> Slip
                    </Box>
                  ) : (
                    <Box />
                  )}
                  <ApproveRejectButtons bookingId={b.id} approve={approveFacility} reject={rejectFacility} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {pending.length === 0 && active.length === 0 && (
        <KEmpty icon="task_alt" title="Inbox zero 🎉" body="Nothing needs your attention right now." />
      )}

      {/* Approved */}
      {active.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <ListGroup title={`Approved · ${active.length}`}>
            {active.map((b) => (
              <ListRow
                key={b.id}
                icon="event_available"
                title={b.facility.name}
                subtitle={`${b.user.name} · ${b.timeSlotStart.toLocaleDateString("en-MY", {
                  day: "numeric",
                  month: "short",
                })}`}
                trailing={<StatusChip status={b.status} />}
              />
            ))}
          </ListGroup>
        </Box>
      )}

      {/* History */}
      {done.length > 0 && (
        <ListGroup title={`History · ${done.length}`}>
          {done.map((b) => (
            <ListRow
              key={b.id}
              icon="history"
              title={b.facility.name}
              subtitle={b.user.name}
              trailing={<StatusChip status={b.status} />}
            />
          ))}
        </ListGroup>
      )}
    </Box>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {children}
      </Typography>
    </Box>
  )
}

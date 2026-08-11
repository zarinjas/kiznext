import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ApproveRejectButtons } from "./approve-reject-buttons"
import { approveFacility, rejectFacility } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

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
        title="Approval Center"
        subtitle="Approve or reject facility bookings. Review pending first."
      />

      {pending.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2,
            mb: 2.5,
            borderRadius: 2,
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
          }}
        >
          <KIcon icon="schedule" size={22} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {pending.length} booking{pending.length === 1 ? "" : "s"} awaiting your approval.
          </Typography>
        </Box>
      )}

      {pending.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif", mb: 1.5 }}>
            Awaiting Approval ({pending.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {pending.map((b) => (
              <Box
                key={b.id}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  p: 2,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 2,
                  alignItems: "flex-start",
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
                    backgroundColor: color.warning.soft,
                    color: color.warning.ink,
                    flexShrink: 0,
                  }}
                >
                  <KIcon icon="task_alt" size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {b.facility.name}
                    <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 500, color: "text.secondary", fontFamily: "monospace" }}>
                      {b.bookingRef}
                    </Box>
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {b.user.name} ({b.user.matricId})
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                    {b.timeSlotStart.toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {b.timeSlotStart.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {b.timeSlotEnd.toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                    {b.purpose && ` · ${b.purpose}`}
                  </Typography>
                  {b.notes && (
                    <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mt: 0.5 }}>
                      Notes: {b.notes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                  {b.pdfUrl && (
                    <Box
                      component="a"
                      href={b.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12.5, fontWeight: 600, color: "text.secondary", textDecoration: "none", "&:hover": { color: color.brand[700] } }}
                    >
                      <KIcon icon="description" size={16} /> PDF
                    </Box>
                  )}
                  <ApproveRejectButtons bookingId={b.id} approve={approveFacility} reject={rejectFacility} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {pending.length === 0 && active.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <KIcon icon="task_alt" size={40} sx={{ color: color.success.main }} />
          <Typography variant="h4" sx={{ fontWeight: 600, mt: 1.5 }}>Inbox zero</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>No active bookings.</Typography>
        </Box>
      )}

      {done.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif", mb: 1.5 }}>
            History ({done.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {done.map((b) => (
              <Box
                key={b.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                <KIcon icon="history" size={18} sx={{ color: "text.disabled" }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {b.facility.name}
                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}> — {b.user.name}</Box>
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace" }}>{b.bookingRef}</Typography>
                <StatusChip status={b.status} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

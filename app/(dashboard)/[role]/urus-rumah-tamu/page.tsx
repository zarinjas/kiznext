import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { GHManageButtons } from "./manage-buttons"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

export default async function UrusRumahTamuPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const bookings = await prisma.guestHouseBooking.findMany({
    where: { deletedAt: null },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  })

  const pending = bookings.filter((b) => b.status === "pending")
  const active = bookings.filter((b) => ["approved", "checked_in"].includes(b.status))
  const done = bookings.filter((b) => ["rejected", "checked_out", "cancelled"].includes(b.status))

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Guest House"
        subtitle="Approve bookings, manage check-in/out, and mark payments."
      />

      {pending.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5, color: color.warning.ink }}>
            Pending Approval ({pending.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {pending.map((b) => (
              <Box key={b.id} sx={{ borderRadius: 2.5, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper", p: 2 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{b.guestName}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {b.user.name} ({b.user.matricId})
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                      {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")} · {b.periodType}
                    </Typography>
                    {b.notes && (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic", display: "block", mt: 0.5 }}>
                        Notes: {b.notes}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                    <StatusChip status={b.paymentStatus} />
                    <GHManageButtons bookingId={b.id} status={b.status} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {active.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5, color: color.info.ink }}>
            Active ({active.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {active.map((b) => (
              <Box key={b.id} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5, p: 1.75, borderRadius: 2.5, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: color.info.soft, color: color.info.ink, flexShrink: 0 }}>
                  <KIcon icon="hotel" size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{b.guestName}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {b.user.name} · {b.startDate.toLocaleDateString("ms-MY")} – {b.endDate.toLocaleDateString("ms-MY")}
                  </Typography>
                </Box>
                <StatusChip status={b.status} />
                <StatusChip status={b.paymentStatus} />
                <GHManageButtons bookingId={b.id} status={b.status} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {pending.length === 0 && active.length === 0 && (
        <KEmpty icon="hotel" title="No active bookings" body="New guest house bookings will appear here." />
      )}

      {done.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5 }}>
            History ({done.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {done.map((b) => (
              <Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
                <KIcon icon="history" size={18} sx={{ color: "text.disabled" }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {b.guestName}
                    <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}> — {b.user.name}</Box>
                  </Typography>
                </Box>
                <StatusChip status={b.status} />
                <StatusChip status={b.paymentStatus} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

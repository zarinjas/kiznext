import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { ParcelForm } from "./parcel-form"
import { ParcelCollectButton } from "./parcel-collect-button"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

export default async function UrusParcelPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const parcels = await prisma.parcel.findMany({
    where: { deletedAt: null },
    include: { user: { select: { name: true, matricId: true } } },
    orderBy: { createdAt: "desc" },
  })

  const active = parcels.filter((p) => p.status === "arrived")
  const done = parcels.filter((p) => p.status === "collected")

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Parcels"
        subtitle="Register parcels that arrive for students."
      />

      <FormSection title="Register New Parcel" subtitle="Enter the student's matric number." icon="inventory_2">
        <ParcelForm />
      </FormSection>

      {active.length === 0 ? (
        <Box sx={{ mt: 3 }}>
          <KEmpty icon="package_2" title="No active parcels" body="Registered parcels waiting for pickup appear here." />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5, color: color.warning.ink }}>
            Not Collected ({active.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {active.map((p) => (
              <Box
                key={p.id}
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
                    backgroundColor: color.warning.soft,
                    color: color.warning.ink,
                    flexShrink: 0,
                  }}
                >
                  <KIcon icon="package_2" size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {p.user.name} ({p.user.matricId})
                  </Typography>
                  {p.description && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{p.description}</Typography>
                  )}
                </Box>
                <ParcelCollectButton parcelId={p.id} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {done.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif", mb: 1.5 }}>
            Collected ({done.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {done.map((p) => (
              <Box
                key={p.id}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}
              >
                <KIcon icon="check_circle" size={18} sx={{ color: color.success.main }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.user.name}</Typography>
                </Box>
                <StatusChip status="collected" />
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {p.collectedAt?.toLocaleDateString("ms-MY")}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

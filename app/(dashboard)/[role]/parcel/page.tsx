import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

export default async function ParcelPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const parcels = await prisma.parcel.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })

  const awaiting = parcels.filter((p) => p.status === "arrived")

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="My Parcels"
        subtitle="Parcels arriving at the KIZ management office, tracked until you collect them."
      />

      {awaiting.length > 0 && (
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
          <KIcon icon="inventory_2" size={22} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            You have {awaiting.length} parcel{awaiting.length > 1 ? "s" : ""} waiting. Collect during office hours
            (Mon–Fri, 8am–5pm) at the KIZ office.
          </Typography>
        </Box>
      )}

      {parcels.length === 0 ? (
        <KEmpty
          icon="inventory_2"
          title="No parcels yet"
          body="When a parcel arrives for you, the admin registers it here."
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {parcels.map((p) => (
            <Box
              key={p.id}
              sx={{
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                p: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
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
                  flexShrink: 0,
                  backgroundColor: p.status === "arrived" ? color.warning.soft : color.success.soft,
                  color: p.status === "arrived" ? color.warning.ink : color.success.ink,
                }}
              >
                <KIcon icon={p.status === "arrived" ? "package_2" : "check_circle"} size={20} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {p.status === "arrived" ? "Arrived" : "Collected"}
                  </Typography>
                  <StatusChip status={p.status} />
                </Box>
                {p.description && (
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                    {p.description}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
                  Registered: {p.createdAt.toLocaleDateString("ms-MY")}
                  {p.collectedAt && ` · Collected: ${p.collectedAt.toLocaleDateString("ms-MY")}`}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

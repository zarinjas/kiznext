import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { color, radius } from "@/lib/theme"

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
            borderRadius: `${radius.cardLg}px`,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
          }}
        >
          <KIcon icon="inventory_2" size={20} />
          <Typography variant="body2" sx={{ fontWeight: 550 }}>
            You have {awaiting.length} parcel{awaiting.length > 1 ? "s" : ""} waiting. Collect during office hours
            (Mon–Fri, 8am–5pm) at the KIZ office.
          </Typography>
        </Box>
      )}

      {parcels.length === 0 ? (
        <KEmpty
          icon="inventory_2"
          title="No parcels waiting"
          body="When something arrives for you, the admin registers it here and we'll let you know."
        />
      ) : (
        <ListGroup>
          {parcels.map((p) => (
            <ListRow
              key={p.id}
              icon={p.status === "arrived" ? "package_2" : "check_circle"}
              title={p.description || (p.status === "arrived" ? "Parcel arrived" : "Parcel collected")}
              subtitle={
                <>
                  Registered {p.createdAt.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                  {p.collectedAt &&
                    ` · Collected ${p.collectedAt.toLocaleDateString("en-MY", {
                      day: "numeric",
                      month: "short",
                    })}`}
                </>
              }
              trailing={<StatusChip status={p.status} />}
            />
          ))}
        </ListGroup>
      )}
    </Box>
  )
}

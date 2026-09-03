import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { ParcelForm } from "./parcel-form"
import { ParcelCollectButton } from "./parcel-collect-button"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"

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
          <KEmpty icon="package_2" title="Nothing here yet" body="Registered parcels waiting for pickup will show up here." />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          <ListGroup title={`Not collected · ${active.length}`}>
            {active.map((p) => (
              <ListRow
                key={p.id}
                icon="package_2"
                title={p.user.name}
                subtitle={p.description ? `${p.user.matricId} · ${p.description}` : p.user.matricId}
                trailing={<ParcelCollectButton parcelId={p.id} />}
              />
            ))}
          </ListGroup>
        </Box>
      )}

      {done.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <ListGroup title={`Collected · ${done.length}`}>
            {done.map((p) => (
              <ListRow
                key={p.id}
                icon="check_circle"
                title={p.user.name}
                subtitle={p.collectedAt?.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                trailing={<StatusChip status="collected" />}
              />
            ))}
          </ListGroup>
        </Box>
      )}
    </Box>
  )
}

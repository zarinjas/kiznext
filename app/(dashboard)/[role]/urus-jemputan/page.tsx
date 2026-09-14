import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { invitationStatus } from "@/lib/invitations"
import { InvitationsClient } from "./invitations-client"

export default async function UrusJemputanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["superadmin"])

  const invitations = await prisma.invitation.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true } } },
  })

  const rows = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    matricId: inv.matricId,
    name: inv.name,
    resident: inv.resident,
    status: invitationStatus(inv),
    invitedByName: inv.invitedBy?.name ?? "—",
    sentCount: inv.sentCount,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }))

  const pendingCount = rows.filter((r) => r.status === "pending").length

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Invitations"
        subtitle={
          pendingCount > 0
            ? `Invite students and staff to join the app by email. ${pendingCount} invitation${pendingCount === 1 ? "" : "s"} still pending.`
            : "Invite students and staff to join the app by email, one at a time or in bulk."
        }
      />
      <InvitationsClient invitations={rows} />
    </Box>
  )
}

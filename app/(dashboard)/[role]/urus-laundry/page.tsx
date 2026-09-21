import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LAUNDRY_VIEW_ROLES, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getLaundrySnapshot } from "@/lib/laundry"
import { LaundryAdmin } from "./laundry-admin"

export default async function UrusLaundryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role as Role
  // Non-managers (e.g. students hitting the URL) go back to their own dashboard.
  // Mutations are still guarded server-side with requireRole.
  if (!LAUNDRY_VIEW_ROLES.includes(role)) redirect(`/${role}`)

  const snapshot = await getLaundrySnapshot(session.user.id)

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Laundry"
        subtitle="Add the machines residents use, mark a machine out of service, and clear stuck reminders."
      />
      <LaundryAdmin
        initialMachines={snapshot.machines}
        defaultImageUrl={snapshot.defaultImageUrl}
        readOnly={role === "pengetua"}
      />
    </Box>
  )
}

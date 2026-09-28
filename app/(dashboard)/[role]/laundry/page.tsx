import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ADMIN_ROLES, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getLaundrySnapshot } from "@/lib/laundry"
import { LaundryClient } from "./laundry-client"

export default async function LaundryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role as Role
  if (role !== "ahli") {
    // Admins and the principal manage machines; everyone else has no laundry surface.
    if (ADMIN_ROLES.includes(role)) {
      redirect(`/${role}/urus-laundry`)
    }
    redirect(`/${role}`)
  }

  const snapshot = await getLaundrySnapshot(session.user.id)

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Bookings"
        title="Laundry"
        subtitle="Set a reminder for the machine you are using."
      />
      <LaundryClient initialSnapshot={snapshot} />
    </Box>
  )
}

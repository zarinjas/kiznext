import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { requireRole, NOTIFICATION_SEND_ROLES, type Role } from "@/lib/rbac"
import { getNotificationAdminData } from "@/lib/notifications"
import { NotificationsAdmin } from "./notifications-admin"

export default async function UrusNotifikasiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, NOTIFICATION_SEND_ROLES)

  const { rows, userOptions } = await getNotificationAdminData()

  return (
    <Box sx={{ maxWidth: 980, mx: "auto" }}>
      <PageHeader
        overline="System"
        title="Notifications"
        subtitle="Send a message to residents in-app, as a device push, or by email. Pick everyone, a role, or specific people."
      />
      <NotificationsAdmin rows={rows} userOptions={userOptions} />
    </Box>
  )
}

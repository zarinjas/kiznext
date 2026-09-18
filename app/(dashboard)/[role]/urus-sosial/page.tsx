import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getStayConnectedAdminData } from "@/lib/stay-connected"
import { StayConnectedAdmin } from "./stay-connected-admin"

export default async function UrusSosialPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const section = await getStayConnectedAdminData()

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="Stay Connected"
        subtitle="Manage the social links shown on the member dashboard — toggle the section, edit its heading and reorder the links."
      />
      <StayConnectedAdmin section={section} />
    </Box>
  )
}

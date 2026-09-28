import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole, REPORT_ROLES, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getReportsData } from "@/lib/reports"
import { ReportsView } from "./reports-view"

export default async function UrusLaporanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, REPORT_ROLES)

  const data = await getReportsData()

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Insights"
        title="Reports"
        subtitle="A read-only snapshot of residence occupancy, bookings and the helpdesk — refreshed on each visit."
      />
      <ReportsView data={data} />
    </Box>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole, RESIDENCE_MANAGE_ROLES, RESIDENCE_VIEW_ROLES, type Role } from "@/lib/rbac"
import { getAppLogoUrl, getStudentCardLogos } from "@/lib/settings"
import { getStudentData } from "@/lib/student-data"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { StudentDataClient } from "./student-data-client"

export default async function UrusPelajarPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, RESIDENCE_VIEW_ROLES)

  const canSync = RESIDENCE_MANAGE_ROLES.includes(session.user.role as Role)

  const [data, appLogoUrl, cardLogos] = await Promise.all([
    getStudentData(),
    getAppLogoUrl(),
    getStudentCardLogos(),
  ])

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Insights"
        title="Student Data"
        subtitle="A read-only snapshot of the active intake — synced from the Google Sheet. Filter by cohort, block or status, then export the admin file."
      />
      <StudentDataClient
        data={data}
        canSync={canSync}
        logos={{ ukmLogoUrl: cardLogos.ukmLogoUrl, appLogoUrl }}
      />
    </Box>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getOnboardingAdminData } from "@/lib/onboarding"
import { OnboardingAdmin } from "./onboarding-admin"

export default async function UrusOnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const slides = await getOnboardingAdminData()

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="Onboarding"
        subtitle="The welcome carousel shown once when a resident opens the mobile app for the first time. Add a title, text, image and gradient per slide."
      />
      <OnboardingAdmin slides={slides} />
    </Box>
  )
}

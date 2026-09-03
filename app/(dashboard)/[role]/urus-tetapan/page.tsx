import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAppLogoUrl, getResendConfig, getStudentCardDesign } from "@/lib/settings"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { SettingsForm } from "./settings-form"
import { ResendSettingsForm } from "./resend-settings-form"
import { StudentCardDesignForm } from "./student-card-design-form"

export default async function UrusTetapanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "superadmin" && session.user.role !== "admin_kiz") {
    redirect(`/${session.user.role}`)
  }

  const [logoUrl, cardDesign, resend] = await Promise.all([
    getAppLogoUrl(),
    getStudentCardDesign(),
    getResendConfig(),
  ])

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="App Settings"
        subtitle="Manage app-wide branding and configuration."
      />
      <SettingsForm currentLogoUrl={logoUrl} />
      <ResendSettingsForm apiKeySet={resend.apiKeySet} initialFrom={resend.from} />
      <StudentCardDesignForm
        currentBackgroundUrl={cardDesign.backgroundUrl}
        currentColor={cardDesign.color}
        currentColorEnd={cardDesign.colorEnd}
        logoUrl={logoUrl}
      />
    </Box>
  )
}

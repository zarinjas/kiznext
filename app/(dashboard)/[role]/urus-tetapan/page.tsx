import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAppLogoUrl, getLoginBackgroundUrl, getDashboardHeroBackground, getDashboardPoster, getResendConfig, getStudentCardDesign, getAllCardBackgrounds } from "@/lib/settings"
import { getSosSettings } from "@/lib/sos"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { SettingsForm } from "./settings-form"
import { ResendSettingsForm } from "./resend-settings-form"
import { StudentCardDesignForm } from "./student-card-design-form"
import { SosSettingsForm } from "./sos-settings-form"

export default async function UrusTetapanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "superadmin" && session.user.role !== "admin_kiz") {
    redirect(`/${session.user.role}`)
  }

  const [logoUrl, loginBackgroundUrl, dashboardHeroBackgroundUrl, dashboardPosterUrl, cardDesign, cardBackgrounds, resend, sos] = await Promise.all([
    getAppLogoUrl(),
    getLoginBackgroundUrl(),
    getDashboardHeroBackground(),
    getDashboardPoster(),
    getStudentCardDesign(),
    getAllCardBackgrounds(),
    getResendConfig(),
    getSosSettings(),
  ])

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="App Settings"
        subtitle="Manage app-wide branding and configuration."
      />
      <SettingsForm
        currentLogoUrl={logoUrl}
        currentLoginBackgroundUrl={loginBackgroundUrl}
        currentDashboardHeroBackgroundUrl={dashboardHeroBackgroundUrl}
        currentDashboardPosterUrl={dashboardPosterUrl}
      />
      <ResendSettingsForm apiKeySet={resend.apiKeySet} initialFrom={resend.from} />
      <SosSettingsForm initial={sos} />
      <StudentCardDesignForm
        backgrounds={cardBackgrounds}
        ukmLogoUrl={cardDesign.ukmLogoUrl}
        kizLogoUrl={cardDesign.kizLogoUrl}
        session={cardDesign.session}
      />
    </Box>
  )
}

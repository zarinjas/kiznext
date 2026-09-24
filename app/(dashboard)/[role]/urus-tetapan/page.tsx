import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  getAppLogoUrl,
  getLoginBackgroundUrl,
  getDashboardHeroBackground,
  getDashboardHeroOverlay,
  getDashboardPoster,
  getShowcaseBackgrounds,
  getResendConfig,
  getStudentCardDesign,
  getAllCardBackgrounds,
} from "@/lib/settings"
import { getSosSettings } from "@/lib/sos"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { radius } from "@/lib/theme"
import { BrandingForm } from "./branding-form"
import { WebSettingsForm } from "./web-settings-form"
import { AppSettingsForm } from "./app-settings-form"
import { ResendSettingsForm } from "./resend-settings-form"
import { StudentCardDesignForm } from "./student-card-design-form"
import { SosSettingsForm } from "./sos-settings-form"

/** Section group label that splits website settings from app settings. */
function GroupHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: `${radius.input}px`,
          display: "grid",
          placeItems: "center",
          backgroundColor: "action.hover",
          color: "text.secondary",
        }}
      >
        <KIcon icon={icon} size={19} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 650, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Box>
    </Box>
  )
}

export default async function UrusTetapanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "superadmin" && session.user.role !== "admin_kiz") {
    redirect(`/${session.user.role}`)
  }

  const [
    logoUrl,
    loginBackgroundUrl,
    webHeroBackgroundUrl,
    appHeroBackgroundUrl,
    dashboardHeroOverlay,
    dashboardPosterUrl,
    showcaseBackgrounds,
    cardDesign,
    cardBackgrounds,
    resend,
    sos,
  ] = await Promise.all([
    getAppLogoUrl(),
    getLoginBackgroundUrl(),
    getDashboardHeroBackground("web"),
    getDashboardHeroBackground("app"),
    getDashboardHeroOverlay(),
    getDashboardPoster(),
    getShowcaseBackgrounds(),
    getStudentCardDesign(),
    getAllCardBackgrounds(),
    getResendConfig(),
    getSosSettings(),
  ])

  return (
    <Box>
      <PageHeader
        overline="Admin"
        title="App Settings"
        subtitle="Website and mobile app appearance, side by side."
      />

      {/* Website + Mobile App, side by side so the page uses the full width. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          columnGap: 2.5,
          alignItems: "start",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <GroupHeading icon="language" title="Website" subtitle="Desktop site appearance" />
          <BrandingForm currentLogoUrl={logoUrl} />
          <WebSettingsForm
            currentLoginBackgroundUrl={loginBackgroundUrl}
            currentDashboardHeroBackgroundUrl={webHeroBackgroundUrl}
            currentDashboardPosterUrl={dashboardPosterUrl}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <GroupHeading icon="smartphone" title="Mobile App" subtitle="Expo app appearance" />
          <AppSettingsForm
            currentDashboardHeroBackgroundUrl={appHeroBackgroundUrl}
            currentDashboardHeroOverlay={dashboardHeroOverlay}
            currentShowcaseBackgrounds={showcaseBackgrounds}
          />
        </Box>
      </Box>

      {/* Shared settings, split into two columns of their own. */}
      <Box sx={{ mt: 0.5 }}>
        <GroupHeading icon="settings" title="General" subtitle="Shared across the website and the app" />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            columnGap: 2.5,
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <StudentCardDesignForm
              backgrounds={cardBackgrounds}
              ukmLogoUrl={cardDesign.ukmLogoUrl}
              kizLogoUrl={cardDesign.kizLogoUrl}
              session={cardDesign.session}
            />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <ResendSettingsForm apiKeySet={resend.apiKeySet} initialFrom={resend.from} />
            <SosSettingsForm initial={sos} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

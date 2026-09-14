import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAppLogoUrl, getLoginBackgroundUrl, getDashboardHeroBackground, getDashboardPoster, getResendConfig, getStudentCardDesign } from "@/lib/settings"
import { getAiAdminConfig, getUnansweredQuestions } from "@/lib/ai/admin-actions"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { SettingsForm } from "./settings-form"
import { ResendSettingsForm } from "./resend-settings-form"
import { StudentCardDesignForm } from "./student-card-design-form"
import { AiSettingsForm } from "./ai-settings-form"

export default async function UrusTetapanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "superadmin" && session.user.role !== "admin_kiz") {
    redirect(`/${session.user.role}`)
  }

  const [logoUrl, loginBackgroundUrl, dashboardHeroBackgroundUrl, dashboardPosterUrl, cardDesign, resend, ai, unanswered] = await Promise.all([
    getAppLogoUrl(),
    getLoginBackgroundUrl(),
    getDashboardHeroBackground(),
    getDashboardPoster(),
    getStudentCardDesign(),
    getResendConfig(),
    getAiAdminConfig(),
    getUnansweredQuestions(),
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
      <StudentCardDesignForm
        currentBackgroundUrl={cardDesign.backgroundUrl}
        ukmLogoUrl={cardDesign.ukmLogoUrl}
        kizLogoUrl={cardDesign.kizLogoUrl}
        session={cardDesign.session}
      />
      <AiSettingsForm
        apiKeySet={ai.apiKeySet}
        apiKeyFromEnv={ai.apiKeyFromEnv}
        initialModel={ai.model}
        initialEmbedModel={ai.embedModel}
        initialName={ai.conciergeName}
        avatarUrl={ai.avatarUrl}
        frames={ai.frames}
        knowledgeCount={ai.knowledgeCount}
        unanswered={unanswered}
      />
    </Box>
  )
}

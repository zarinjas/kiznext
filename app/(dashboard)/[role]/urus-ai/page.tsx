import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { AiSettingsForm } from "./ai-settings-form"
import { getAiAdminConfig, getUnansweredQuestions } from "@/lib/ai/admin-actions"

export default async function UrusAiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const [ai, unanswered] = await Promise.all([getAiAdminConfig(), getUnansweredQuestions()])

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <PageHeader
        overline="AI"
        title="KIZ-AI"
        subtitle="Providers, the robot mascot, the knowledge index, and questions the AI couldn't answer."
      />
      <AiSettingsForm
        apiKeySet={ai.apiKeySet}
        apiKeyFromEnv={ai.apiKeyFromEnv}
        initialModel={ai.model}
        initialEmbedModel={ai.embedModel}
        initialName={ai.conciergeName}
        initialChatProvider={ai.chatProvider}
        initialEmbedProvider={ai.embedProvider}
        initialRetrievalMode={ai.retrievalMode}
        initialOllamaUrl={ai.ollamaUrl}
        initialOllamaModel={ai.ollamaModel}
        initialOllamaEmbedModel={ai.ollamaEmbedModel}
        avatarUrl={ai.avatarUrl}
        frames={ai.frames}
        knowledgeCount={ai.knowledgeCount}
        embeddedCount={ai.embeddedCount}
        enabled={ai.enabled}
        unanswered={unanswered}
      />
    </Box>
  )
}

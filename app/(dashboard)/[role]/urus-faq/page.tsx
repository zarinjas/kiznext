import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { FaqAdmin } from "./faq-admin"
import { FaqSheetSync } from "./faq-sheet-sync"
import { getUnansweredQuestions } from "@/lib/ai/admin-actions"
import { getFaqSheetStatus } from "@/lib/ai/faq-actions"

export default async function UrusFaqPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const [faqs, unanswered, sheet] = await Promise.all([
    prisma.faq.findMany({
      where: { deletedAt: null },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    }),
    getUnansweredQuestions(),
    getFaqSheetStatus(),
  ])

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <PageHeader
        overline="AI"
        title="FAQ Knowledge"
        subtitle="The questions KIZ-AI answers. Fill them in, import or sync from Google Sheets, then re-index."
      />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <FaqSheetSync
          serviceAccountSet={sheet.serviceAccountSet}
          initialSpreadsheetId={sheet.spreadsheetId ?? ""}
          initialRange={sheet.range ?? ""}
        />
        <FaqAdmin
          faqs={faqs.map((f) => ({
            id: f.id,
            category: f.category,
            question: f.question,
            answer: f.answer,
            keywords: f.keywords,
            published: f.published,
          }))}
          unanswered={unanswered}
        />
      </Box>
    </Box>
  )
}

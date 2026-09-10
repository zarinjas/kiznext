import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { ReportForm } from "./report-form"
import { LostFoundList } from "./lost-found-list"
import { FormSection } from "@/components/kiz/patterns/form-section"

export default async function HilangPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const items = await prisma.lostFoundItem.findMany({
    where: { deletedAt: null },
    include: { reporter: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  const openCount = items.filter((i) => i.status === "lost" || i.status === "found").length

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="Lost & Found"
        subtitle="Report lost or found items at KIZ — the more details, the easier it is to reunite things."
      />

      <FormSection title="New Report" subtitle="Help the community find their things." icon="add_box">
        <ReportForm role={session.user.role} />
      </FormSection>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, mt: 3, px: { xs: 0.5, sm: 0 } }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
          Latest Reports
        </Typography>
        {items.length > 0 && (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {openCount} still open · {items.length} total
          </Typography>
        )}
      </Box>

      <LostFoundList items={items} userId={session.user.id} role={session.user.role} />
    </Box>
  )
}

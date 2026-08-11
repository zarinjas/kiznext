import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
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

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="Lost & Found"
        subtitle="Report lost or found items at KIZ."
      />

      <FormSection title="New Report" subtitle="Help the community find their things." icon="add_box">
        <ReportForm role={session.user.role} />
      </FormSection>

      <Box sx={{ mt: 3 }}>
        <LostFoundList items={items} userId={session.user.id} role={session.user.role} />
      </Box>
    </Box>
  )
}

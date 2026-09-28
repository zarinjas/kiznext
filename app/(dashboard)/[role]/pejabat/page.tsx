import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { isOfficeHours } from "@/lib/office-hours"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { OfficeViewer } from "@/components/shared/office/office-viewer"

export default async function PejabatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const offices = await prisma.office.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  })

  return (
    <Box sx={{ pt: 0.5 }}>
      <PageHeader
        overline="Support"
        title="KIZ Offices"
        subtitle="Find the right office for your enquiry or request."
      />
      <OfficeViewer
        offices={offices.map((o) => ({
          id: o.id,
          name: o.name,
          nameEn: o.nameEn,
          description: o.description,
          categoryLabel: o.categoryLabel,
          categoryIcon: o.categoryIcon,
          categoryTone: o.categoryTone,
          services: o.services,
          location: o.location,
          hoursLabel: o.hoursLabel,
          phone: o.phone,
          featuredImage: o.featuredImage,
          gallery: o.gallery,
        }))}
        directoryHref={`/${session.user.role}/direktori`}
        officeOpen={isOfficeHours()}
      />
    </Box>
  )
}

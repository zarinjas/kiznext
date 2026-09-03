import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { OfficeViewer } from "@/components/shared/office/office-viewer"

export default async function PejabatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [offices, blocks] = await Promise.all([
    prisma.office.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.block.findMany({ where: { deletedAt: null } }),
  ])

  const panoramaBlock = blocks.find((b) => b.panoramaImage) ?? null

  return (
    <Box sx={{ pt: 0.5 }}>
      <PageHeader
        overline="Support"
        title="Administrative Offices"
        subtitle="Two offices, two functions — find the right one before you queue."
      />
      <OfficeViewer
        offices={offices.map((o) => ({
          id: o.id,
          name: o.name,
          description: o.description,
          featuredImage: o.featuredImage,
          gallery: o.gallery,
        }))}
        panorama={
          panoramaBlock?.panoramaImage
            ? {
                image: panoramaBlock.panoramaImage,
                leftLabel: offices[0]?.name ?? "KIZ Administration Office",
                leftX: panoramaBlock.panoramaLeftX,
                rightLabel: offices[1]?.name ?? "UKM Real Estate Office",
                rightX: panoramaBlock.panoramaRightX,
              }
            : null
        }
      />
    </Box>
  )
}

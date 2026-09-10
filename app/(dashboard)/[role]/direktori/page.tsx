import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { ArNavigator } from "@/components/shared/ar/ar-navigator"

export default async function DirektoriPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const destinations = await prisma.destination.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return (
    <Box sx={{ pt: 0.5 }}>
      <ArNavigator
        destinations={destinations.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          icon: d.icon,
          latitude: d.latitude,
          longitude: d.longitude,
          indoor: d.indoor,
          building: d.building,
        }))}
      />
    </Box>
  )
}

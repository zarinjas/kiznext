import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KadMayaCard } from "@/components/shared/kad-maya-card"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

export default async function KadMayaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      matricId: true,
      block: true,
      roomNumber: true,
      avatarUrl: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <Box sx={{ maxWidth: 440, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PageHeader overline="Community" title="eCard" subtitle="Your KIZ Digital ID Card." />

      <Box sx={{ width: "100%", mt: 1 }}>
        <KadMayaCard
          name={user.name}
          matricId={user.matricId}
          block={user.block}
          roomNumber={user.roomNumber}
          avatarUrl={user.avatarUrl}
        />
      </Box>

      <Box
        sx={{
          mt: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.75,
          borderRadius: 2,
          backgroundColor: color.info.soft,
          color: color.info.ink,
          maxWidth: 360,
        }}
      >
        <KIcon icon="info" size={18} />
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          Show this QR code to security officers or KIZ staff for identity verification.
        </Typography>
      </Box>
    </Box>
  )
}

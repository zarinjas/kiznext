import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { ProfileForm } from "./profile-form"
import { getResidentRoomLabel } from "@/lib/bilik"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, roomLabel] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        matricId: true,
        phone: true,
        role: true,
        avatarUrl: true,
      },
    }),
    session.user.role === "ahli" ? getResidentRoomLabel(session.user.id) : Promise.resolve(null),
  ])

  if (!user) redirect("/login")

  // Gender comes from the linked intake record (eKolej import), not the profile
  // itself — a single source of truth so students can't claim a different gender
  // than the one that gates room selection.
  const eligible = await prisma.eligibleStudent.findFirst({
    where: { matricId: user.matricId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { gender: true },
  })

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader overline="Account" title="Profile" subtitle="Update your personal information." />
      <ProfileForm user={{ ...user, gender: eligible?.gender ?? null }} roomLabel={roomLabel} />
    </Box>
  )
}

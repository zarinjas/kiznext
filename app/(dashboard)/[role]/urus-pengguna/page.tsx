import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { UsersClient } from "./users-client"
import { getResidentRoomLabels } from "@/lib/bilik"
import { classifyCohort, resolveCurrentPrefix } from "@/lib/student-cohort"
import type { StudentCohort } from "@/components/shared/cohort-chip"

export default async function UrusPenggunaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  const [roomLabels, blockRows] = await Promise.all([
    getResidentRoomLabels(users.map((u) => u.id)),
    prisma.residenceBlock.findMany({
      where: { deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    }),
  ])
  const blockOptions = blockRows.map((b) => b.name)

  // Cohort (Junior/Senior/Postgrad) is derived from the active intake's matrics
  // — students outside it, and non-student roles, simply have no cohort.
  const intakeStudents = await prisma.eligibleStudent.findMany({
    where: { deletedAt: null, intake: { status: "active", deletedAt: null } },
    select: { matricId: true, yearOfStudy: true },
  })
  const currentPrefix = resolveCurrentPrefix(intakeStudents.map((s) => s.matricId))
  const yearByMatric = new Map(intakeStudents.map((s) => [s.matricId.toUpperCase(), s.yearOfStudy]))
  const cohortFor = (matricId: string, role: string): StudentCohort | null =>
    role === "ahli" ? classifyCohort(matricId, currentPrefix, yearByMatric.get(matricId.toUpperCase())) : null

  const needsReview = users.filter((u) => u.accountStatus !== "active").length

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Users"
        subtitle={
          needsReview > 0
            ? `Create and edit accounts, reset passwords, and remove users. ${needsReview} self-registered account${needsReview === 1 ? "" : "s"} ${needsReview === 1 ? "is" : "are"} waiting for review.`
            : "Create and edit accounts, reset passwords, and remove users from the app."
        }
      />
      <UsersClient
        currentUserId={session.user.id}
        isSuperAdmin={session.user.role === "superadmin"}
        blockOptions={blockOptions}
        users={users.map((u) => ({
          id: u.id,
          matricId: u.matricId,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          block: u.block,
          position: u.position,
          cohort: cohortFor(u.matricId, u.role),
          accountStatus: u.accountStatus,
          emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
          roomLabel: roomLabels.get(u.id) ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </Box>
  )
}

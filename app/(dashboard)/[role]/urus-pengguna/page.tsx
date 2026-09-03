import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { UsersClient } from "./users-client"

export default async function UrusPenggunaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["superadmin", "admin_kiz"])

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Users"
        subtitle="Create and edit accounts, reset passwords, and remove users from the app."
      />
      <UsersClient
        currentUserId={session.user.id}
        isSuperAdmin={session.user.role === "superadmin"}
        users={users.map((u) => ({
          id: u.id,
          matricId: u.matricId,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          block: u.block,
          roomNumber: u.roomNumber,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </Box>
  )
}

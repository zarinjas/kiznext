import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/shared/dashboard-nav"
import { Role } from "@/lib/rbac"

const roleLabels: Record<Role, string> = {
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Pengetua",
  ahli: "Pelajar",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardNav
        role={session.user.role}
        userName={session.user.name ?? ""}
        roleLabel={roleLabels[session.user.role]}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}

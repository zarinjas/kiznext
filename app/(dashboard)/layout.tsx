import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/shared/dashboard-nav"
import { MobileTopBar } from "@/components/shared/mobile-top-bar"
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav"
import { Role } from "@/lib/rbac"
import { getAppLogoUrl } from "@/lib/settings"

const roleLabels: Record<Role, string> = {
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Principal",
  ahli: "Student",
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

  const { role, name } = session.user
  const logoUrl = await getAppLogoUrl()

  if (role === "ahli") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MobileTopBar
          userName={name ?? ""}
          roleLabel={roleLabels[role]}
          role={role}
          logoUrl={logoUrl}
        />
        <main className="flex-1 pb-24">{children}</main>
        <MobileBottomNav role={role} />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardNav
        role={role}
        userName={name ?? ""}
        roleLabel={roleLabels[role]}
        logoUrl={logoUrl}
      />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  )
}

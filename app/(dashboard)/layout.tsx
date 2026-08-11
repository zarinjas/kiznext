import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/kiz/shell/app-shell"
import { getAppLogoUrl } from "@/lib/settings"
import type { Role } from "@/lib/rbac"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const role = session.user.role as Role
  const name = session.user.name ?? ""
  const logoUrl = await getAppLogoUrl()

  return (
    <AppShell role={role} userName={name} logoUrl={logoUrl}>
      {children}
    </AppShell>
  )
}

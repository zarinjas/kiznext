import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/kiz/shell/app-shell"
import { PendingGate } from "@/components/shared/pending-gate"
import { getAppLogoUrl } from "@/lib/settings"
import { getBilikWindowState } from "@/lib/bilik"
import { autoUpgradePendingUser } from "@/lib/registration"
import type { AccountStatus, Role } from "@/lib/rbac"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const role = session.user.role as Role
  const name = session.user.name ?? ""

  // Self-service accounts that haven't finished verification (or whose matric
  // isn't on the KIZ list yet) get a full-screen status wall instead of the app.
  // The DB is re-checked only when the session says the account isn't active, so
  // an admin approving someone mid-session takes effect on their next request.
  if (session.user.accountStatus !== "active") {
    const status: AccountStatus = await autoUpgradePendingUser(session.user.id)
    if (status !== "active") {
      return <PendingGate name={name} matricId={session.user.matricId} status={status} />
    }
  }

  const [logoUrl, bilikState] = await Promise.all([getAppLogoUrl(), getBilikWindowState()])
  const bilikOpen = bilikState === "open" || bilikState === "closing_soon"

  return (
    <AppShell role={role} userName={name} logoUrl={logoUrl} bilikOpen={bilikOpen}>
      {children}
    </AppShell>
  )
}

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAppLogoUrl } from "@/lib/settings"
import { SettingsForm } from "./settings-form"

export default async function UrusTetapanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "superadmin" && session.user.role !== "admin_kiz") {
    redirect(`/${session.user.role}`)
  }

  const logoUrl = await getAppLogoUrl()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl text-foreground">App Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage app-wide branding and configuration.
      </p>

      <div className="mt-6 space-y-6">
        <SettingsForm currentLogoUrl={logoUrl} />
      </div>
    </div>
  )
}

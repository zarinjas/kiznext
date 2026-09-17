import { getAppLogoUrl } from "@/lib/settings"
import { getPasswordResetInfo } from "@/lib/registration"
import { SetPasswordForm } from "./set-password-form"

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const [logoUrl, info] = await Promise.all([getAppLogoUrl(), getPasswordResetInfo(token ?? "")])

  return (
    <SetPasswordForm
      logoUrl={logoUrl}
      token={token ?? ""}
      name={info.ok ? info.name : undefined}
      matricId={info.ok ? info.matricId : undefined}
      linkError={!info.ok ? info.error : undefined}
    />
  )
}

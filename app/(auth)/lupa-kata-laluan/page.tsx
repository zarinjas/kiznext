import { getAppLogoUrl } from "@/lib/settings"
import { ForgotPasswordForm } from "./forgot-password-form"

export default async function ForgotPasswordPage() {
  const logoUrl = await getAppLogoUrl()

  return <ForgotPasswordForm logoUrl={logoUrl} />
}

import { getAppLogoUrl } from "@/lib/settings"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const logoUrl = await getAppLogoUrl()

  return <LoginForm logoUrl={logoUrl} />
}

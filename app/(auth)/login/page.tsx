import { getAppLogoUrl, getLoginBackgroundUrl } from "@/lib/settings"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const [logoUrl, loginBackgroundUrl] = await Promise.all([getAppLogoUrl(), getLoginBackgroundUrl()])

  return <LoginForm logoUrl={logoUrl} loginBackgroundUrl={loginBackgroundUrl} />
}

import { getAppLogoUrl, getLoginBackgroundUrl } from "@/lib/settings"
import { LoginForm } from "./login-form"

/** Only allow same-site relative paths, so ?callbackUrl can't open-redirect. */
function safeCallback(value: string | undefined): string {
  if (!value) return "/dashboard"
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard"
  return value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const [logoUrl, loginBackgroundUrl] = await Promise.all([getAppLogoUrl(), getLoginBackgroundUrl()])

  return (
    <LoginForm
      logoUrl={logoUrl}
      loginBackgroundUrl={loginBackgroundUrl}
      callbackUrl={safeCallback(callbackUrl)}
    />
  )
}

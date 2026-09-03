import { getAppLogoUrl } from "@/lib/settings"
import { RegisterForm } from "./register-form"

export default async function RegisterPage() {
  const logoUrl = await getAppLogoUrl()

  return <RegisterForm logoUrl={logoUrl} />
}

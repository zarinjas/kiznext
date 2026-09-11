import { getAppLogoUrl } from "@/lib/settings"
import { RegisterForm } from "./register-form"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ matric?: string; name?: string }>
}) {
  const { matric, name } = await searchParams
  const logoUrl = await getAppLogoUrl()

  return (
    <RegisterForm
      logoUrl={logoUrl}
      defaultMatric={matric?.trim().toUpperCase() || undefined}
      defaultName={name?.trim() || undefined}
    />
  )
}

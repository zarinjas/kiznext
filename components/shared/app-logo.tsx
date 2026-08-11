import { getAppLogoUrl } from "@/lib/settings"

interface Props {
  className?: string
  fallback?: string
}

export async function AppLogo({ className = "", fallback = "KIZ" }: Props) {
  const logoUrl = await getAppLogoUrl()

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={fallback}
        className={className || "h-8 w-auto object-contain"}
      />
    )
  }

  return (
    <span className={`font-heading text-lg leading-none text-primary-foreground ${className}`}>
      {fallback}
    </span>
  )
}

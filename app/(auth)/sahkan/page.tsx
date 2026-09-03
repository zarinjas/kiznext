import Box from "@mui/material/Box"
import { getAppLogoUrl } from "@/lib/settings"
import { verifyEmailToken } from "@/lib/registration"
import { VerifyCard } from "./verify-card"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = await verifyEmailToken(token ?? "")
  const logoUrl = await getAppLogoUrl()

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        backgroundColor: "background.default",
      }}
    >
      <VerifyCard
        logoUrl={logoUrl}
        ok={result.ok}
        pending={result.ok && result.accountStatus === "pending"}
        error={!result.ok ? result.error : undefined}
      />
    </Box>
  )
}

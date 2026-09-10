"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { color } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"

export function SessionErrorCard({
  logoUrl,
  message,
}: {
  logoUrl: string | null
  message: string
}) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        backgroundColor: "background.default",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        {logoUrl ? (
          <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 44, mb: 2.5, objectFit: "contain" }} />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 48,
              mx: "auto",
              mb: 2.5,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[900],
              color: "#fff",
              fontSize: 20,
              fontWeight: 650,
            }}
          >
            K
          </Box>
        )}
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.danger.soft,
            color: color.danger.ink,
          }}
        >
          <KIcon icon="qr_code_2" size={30} />
        </Box>
        <Typography variant="h1" sx={{ mb: 1, fontSize: { xs: 24, sm: 28 } }}>
          Session unavailable
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          {message} Please ask the staff at the KIZ counter.
        </Typography>
        <Button component="a" href="/login" variant="contained" size="large" fullWidth>
          Go to sign in
        </Button>
      </Box>
    </Box>
  )
}

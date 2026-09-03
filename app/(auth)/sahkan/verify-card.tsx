"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { color } from "@/lib/theme"

interface Props {
  logoUrl: string | null
  ok: boolean
  pending: boolean
  error?: string
}

export function VerifyCard({ logoUrl, ok, pending, error }: Props) {
  return (
    <Box sx={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
        {logoUrl ? (
          <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 48, width: "auto", objectFit: "contain" }} />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 48,
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
      </Box>

      <Box
        sx={{
          width: 56,
          height: 56,
          mx: "auto",
          mb: 2.5,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...(ok
            ? { backgroundColor: color.success.soft, color: color.success.ink }
            : { backgroundColor: color.danger.soft, color: color.danger.ink }),
        }}
      >
        <span className="material-symbols-rounded" style={{ fontSize: 28 }}>
          {ok ? "verified" : "error"}
        </span>
      </Box>

      <Typography variant="h1" sx={{ mb: 1, fontSize: { xs: 26, sm: 30 } }}>
        {ok ? "Email confirmed" : "Link not valid"}
      </Typography>

      {ok && !pending && (
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          Your email is verified and your account is ready. You can now sign in
          with your Matric No. and password.
        </Typography>
      )}

      {ok && pending && (
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          Your email is verified. Your Matric No. is not on the KIZ student list
          just yet — your account will unlock automatically once the office
          uploads this session list. You can sign in now to check the status.
        </Typography>
      )}

      {!ok && (
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
          {error} If the link keeps failing, sign in to request a new one.
        </Typography>
      )}

      <Button component={Link} href="/login" variant="contained" size="large" fullWidth>
        {ok ? "Go to sign in" : "Back to sign in"}
      </Button>
    </Box>
  )
}

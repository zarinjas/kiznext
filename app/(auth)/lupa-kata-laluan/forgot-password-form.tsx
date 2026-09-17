"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { color, gradient } from "@/lib/theme"
import { requestReset } from "../reset-actions"

interface Props {
  logoUrl: string | null
}

export function ForgotPasswordForm({ logoUrl }: Props) {
  const [sent, setSent] = useState<string>("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const matricId = ((form.get("matricId") as string) ?? "").trim().toUpperCase()

    const result = await requestReset(matricId)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setSent(result.message)
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", backgroundColor: "background.default" }}>
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 3, sm: 6 } }}>
        <Box sx={{ width: "100%", maxWidth: 380 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 5 }}>
            {logoUrl ? (
              <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 32, width: "auto", objectFit: "contain" }} />
            ) : (
              <>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: color.brand[900],
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 650,
                    letterSpacing: "-0.02em",
                  }}
                >
                  K
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.015em" }}>KIZ</Typography>
              </>
            )}
          </Box>

          {sent ? (
            <Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2.5,
                  backgroundColor: color.success.soft,
                  color: color.success.ink,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>mark_email_read</span>
              </Box>
              <Typography variant="h1" sx={{ mb: 1 }}>Check your inbox</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
                {sent}
                <br />
                The link works once and expires in 1 hour.
              </Typography>
              <Button component={Link} href="/login" variant="contained" size="large" fullWidth>
                Back to sign in
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h1" sx={{ mb: 1 }}>Forgot password?</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                Enter your Matric No. and we&apos;ll email you a link to choose a new password.
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  id="matricId"
                  name="matricId"
                  label="Matric No."
                  placeholder="A123456"
                  autoComplete="username"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  required
                  fullWidth
                  slotProps={{ htmlInput: { sx: { textTransform: "uppercase" } } }}
                />

                {error && <Alert severity="error" variant="standard">{error}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  fullWidth
                  startIcon={loading ? <CircularProgress size={15} color="inherit" /> : undefined}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </Box>

              <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Remembered it?{" "}
                </Typography>
                <Typography component={Link} href="/login" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
                  Sign in
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          width: "46%",
          maxWidth: 620,
          m: 1.5,
          ml: 0,
          p: 7,
          position: "relative",
          overflow: "hidden",
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          backgroundImage: gradient.panel,
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />
        <Box sx={{ position: "relative" }}>
          <Typography sx={{ fontSize: 34, fontWeight: 640, lineHeight: 1.15, letterSpacing: "-0.032em" }}>
            Back to your
            <br />
            KIZ account.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 2, maxWidth: 400 }}>
            We&apos;ll send a secure, single-use link to the UKM email on your account — no need
            to queue at the office.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

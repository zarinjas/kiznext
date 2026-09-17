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
import { submitNewPassword } from "../reset-actions"

interface Props {
  logoUrl: string | null
  token: string
  name?: string
  matricId?: string
  linkError?: string
}

export function SetPasswordForm({ logoUrl, token, name, matricId, linkError }: Props) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const form = new FormData(e.currentTarget)
    const password = (form.get("password") as string) ?? ""
    const confirm = (form.get("confirm") as string) ?? ""
    if (password !== confirm) {
      setError("Passwords don't match — give them another go.")
      return
    }

    setLoading(true)
    const result = await submitNewPassword(token, password)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  const invalid = Boolean(linkError) && !done

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

          {done ? (
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
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>lock_reset</span>
              </Box>
              <Typography variant="h1" sx={{ mb: 1 }}>Password updated</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
                You can now sign in with your new password.
              </Typography>
              <Button component={Link} href="/login" variant="contained" size="large" fullWidth>
                Go to sign in
              </Button>
            </Box>
          ) : invalid ? (
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
                  backgroundColor: color.danger.soft,
                  color: color.danger.ink,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>link_off</span>
              </Box>
              <Typography variant="h1" sx={{ mb: 1 }}>Link not valid</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
                {linkError} Request a fresh link to try again.
              </Typography>
              <Button component={Link} href="/lupa-kata-laluan" variant="contained" size="large" fullWidth>
                Request a new link
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h1" sx={{ mb: 1 }}>Choose a new password</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                {name && matricId
                  ? `Hi ${name} — set a new password for ${matricId}.`
                  : "Set a new password for your KIZ account."}
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  id="password"
                  name="password"
                  label="New password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  slotProps={{ htmlInput: { minLength: 8 } }}
                  required
                  fullWidth
                />
                <TextField
                  id="confirm"
                  name="confirm"
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  slotProps={{ htmlInput: { minLength: 8 } }}
                  required
                  fullWidth
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
                  {loading ? "Saving…" : "Save new password"}
                </Button>
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
            Secure, simple,
            <br />
            self-service.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 2, maxWidth: 400 }}>
            Choose a strong password you&apos;ll remember. The reset link works once and
            expires after an hour.
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

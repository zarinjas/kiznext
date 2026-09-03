"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { color, gradient, glass } from "@/lib/theme"
import { resendVerification } from "../daftar/actions"

interface Props {
  logoUrl: string | null
}

const highlights = [
  { icon: "meeting_room", title: "Bookings", body: "Facilities and guest house, approved in a tap." },
  { icon: "campaign", title: "Announcements", body: "College updates that reach every resident." },
  { icon: "support_agent", title: "Support", body: "Helpdesk, lost & found and community in one place." },
]

export function LoginForm({ logoUrl }: Props) {
  const [error, setError] = useState<string>("")
  const [emailNotice, setEmailNotice] = useState<string>("")
  const [unverified, setUnverified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleLogin(matricId: string, password: string) {
    setLoading(true)
    setError("")
    setEmailNotice("")
    setUnverified(false)

    try {
      const result = await signIn("credentials", {
        matricId: matricId.trim().toUpperCase(),
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      })

      if (!result?.url || result?.error) {
        if ((result?.error ?? "").toUpperCase().includes("EMAIL_NOT_VERIFIED")) {
          setUnverified(true)
          setEmailNotice("Almost there — your email hasn't been confirmed yet. Check your inbox, or send a fresh link below.")
        } else {
          setError("Hmm, that Matric No. or password doesn't match. Give it another go.")
        }
        setLoading(false)
        return
      }

      window.location.assign(result.url)
    } catch {
      setError("We could not connect to the login service. Please try again.")
      setLoading(false)
    }
  }

  async function handleResend(matricId: string, password: string) {
    setResending(true)
    setEmailNotice("")
    const result = await resendVerification(matricId.trim().toUpperCase(), password)
    setResending(false)
    if (result.ok) {
      setEmailNotice("A fresh verification link is on its way. Check your inbox (and spam folder).")
    } else {
      setEmailNotice(`Couldn't resend: ${result.error}`)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await handleLogin(form.get("matricId") as string, form.get("password") as string)
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", backgroundColor: "background.default" }}>
      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: { xs: 3, sm: 6 },
        }}
      >
        <Box component="form" id="login-form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 360 }}>
          {/* Brand */}
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
                <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.015em" }}>
                  KIZ
                </Typography>
              </>
            )}
          </Box>

          <Typography variant="h1" sx={{ mb: 1 }}>Sign in</Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
            Use your UKM Matric No. to continue.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField id="matricId" name="matricId" label="Matric No." type="text" placeholder="A123456" autoComplete="username" required fullWidth />
            <TextField id="password" name="password" label="Password" type="password" placeholder="••••••••" autoComplete="current-password" required fullWidth />
            {error && <Alert severity="error" variant="standard">{error}</Alert>}
            {emailNotice && (
              <Alert severity={unverified ? "warning" : "info"} variant="standard">
                {emailNotice}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || resending}
              fullWidth
              sx={{ mt: 1 }}
              startIcon={loading ? <CircularProgress size={15} color="inherit" /> : undefined}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            {unverified && (
              <Button
                type="button"
                variant="text"
                size="small"
                disabled={resending}
                onClick={() => {
                  const f = new FormData(document.getElementById("login-form") as HTMLFormElement)
                  handleResend((f.get("matricId") as string) ?? "", (f.get("password") as string) ?? "")
                }}
              >
                {resending ? "Sending…" : "Resend verification email"}
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              New to the app?{" "}
              <Typography component={Link} href="/daftar" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
                Create an account
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Quick demo login (password: kiz123)
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
              <Button type="button" variant="contained" size="large" disabled={loading} onClick={() => handleLogin("A123456", "kiz123")}>
                Student
              </Button>
              <Button type="button" variant="contained" size="large" disabled={loading} onClick={() => handleLogin("ADMIN001", "kiz123")}>
                Super Admin
              </Button>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ display: "block", mt: 4, color: "text.disabled" }}>
            Need help? Contact the KIZ management office.
          </Typography>
        </Box>
      </Box>

      {/* Gradient showcase panel — desktop only */}
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
          "[data-mui-color-scheme='dark'] &": { backgroundImage: "none", backgroundColor: "background.paper" },
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />

        <Box sx={{ position: "relative" }}>
          <Typography sx={{ fontSize: 34, fontWeight: 640, lineHeight: 1.15, letterSpacing: "-0.032em" }}>
            Everything for college life,
            <br />
            in one place.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 2, maxWidth: 400 }}>
            The digital home of Kolej Ibu Zain — bookings, announcements, support and
            community, built for residents and staff.
          </Typography>

          <Box sx={{ mt: 5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {highlights.map((h) => (
              <Box
                key={h.title}
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.75,
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: glass.background,
                  backdropFilter: "blur(8px)",
                }}
              >
                <Box
                  component="span"
                  className="material-symbols-rounded"
                  sx={{ fontSize: 20, color: "text.secondary", lineHeight: 1, mt: 0.25 }}
                >
                  {h.icon}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{h.title}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>{h.body}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}


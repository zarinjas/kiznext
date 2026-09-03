"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { color, gradient, glass } from "@/lib/theme"
import { register } from "./actions"

interface Props {
  logoUrl: string | null
}

type Outcome =
  | { kind: "form" }
  | { kind: "success"; message: string; role: "ahli" | "staf" }
  | { kind: "error"; error: string }

function accountHint(email: string): string | null {
  const e = email.trim().toLowerCase()
  if (e.endsWith("@siswa.ukm.edu.my")) return "UKM student address — you'll get a Student account."
  if (e.endsWith("@ukm.edu.my")) return "UKM staff address — you'll get a Staff account."
  if (e.includes("@")) return "Must be an official UKM email (@siswa.ukm.edu.my for students, @ukm.edu.my for staff)."
  return null
}

export function RegisterForm({ logoUrl }: Props) {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "form" })
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setOutcome({ kind: "form" })

    const form = new FormData(e.currentTarget)
    const password = (form.get("password") as string) ?? ""
    const confirm = (form.get("confirm") as string) ?? ""
    if (password !== confirm) {
      setOutcome({ kind: "error", error: "Passwords don't match — give them another go." })
      setLoading(false)
      return
    }

    const result = await register({
      matricId: ((form.get("matricId") as string) ?? "").trim().toUpperCase(),
      name: ((form.get("name") as string) ?? "").trim(),
      email: ((form.get("email") as string) ?? "").trim().toLowerCase(),
      password,
    })
    setLoading(false)

    if (!result.ok) {
      setOutcome({ kind: "error", error: result.error })
      return
    }
    setOutcome({ kind: "success", message: result.message, role: result.role })
  }

  const hint = accountHint(email)

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
        <Box sx={{ width: "100%", maxWidth: 400 }}>
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

          {outcome.kind === "success" ? (
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
                <span className="material-symbols-rounded" style={{ fontSize: 24 }}>mail</span>
              </Box>
              <Typography variant="h1" sx={{ mb: 1 }}>Check your inbox</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 3 }}>
                {outcome.message}
                <br />
                Click the link inside to verify your address — it expires in 24 hours.
              </Typography>
              <Alert severity="info" variant="standard" sx={{ mb: 3 }}>
                You will be able to sign in once your email is confirmed
                {outcome.role === "ahli" ? " and your matric No. is on the KIZ student list." : "."}
              </Alert>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<span className="material-symbols-rounded" style={{ fontSize: 18 }}>login</span>}
              >
                Go to sign in
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h1" sx={{ mb: 1 }}>Create your account</Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
                Register with your UKM email to join the KIZ app.
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
                <TextField id="name" name="name" label="Full name" placeholder="As printed on your ID" autoComplete="name" required fullWidth />
                <TextField
                  id="email"
                  name="email"
                  label="UKM email"
                  type="email"
                  placeholder={email.includes("@siswa") ? "you@siswa.ukm.edu.my" : "you@ukm.edu.my"}
                  autoComplete="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  helperText={hint ?? " "}
                />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <TextField id="password" name="password" label="Password" type="password" placeholder="At least 8 characters" autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8 } }} required fullWidth />
                  <TextField id="confirm" name="confirm" label="Confirm password" type="password" placeholder="Repeat password" autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8 } }} required fullWidth />
                </Box>

                {outcome.kind === "error" && <Alert severity="error" variant="standard">{outcome.error}</Alert>}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  fullWidth
                  startIcon={loading ? <CircularProgress size={15} color="inherit" /> : undefined}
                >
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </Box>

              <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Already have an account?
                </Typography>{" "}
                <Typography component={Link} href="/login" variant="caption" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none" }}>
                  Sign in
                </Typography>
              </Box>
            </>
          )}
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
            Your digital home at
            <br />
            Kolej Ibu Zain.
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 2, maxWidth: 400 }}>
            Book facilities, follow announcements, reach the helpdesk and keep your eCard —
            all from one app, built for UKM students and staff.
          </Typography>

          <Box sx={{ mt: 5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            {[
              { icon: "badge", title: "Students register with @siswa.ukm.edu.my", body: "Your matric No. is matched against the official KIZ list." },
              { icon: "work", title: "Staff register with @ukm.edu.my", body: "Accounts are tagged Staff until you're appointed an admin." },
              { icon: "verified", title: "Confirm your email to begin", body: "A verification link keeps the community genuine." },
            ].map((h) => (
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
                <Box component="span" className="material-symbols-rounded" sx={{ fontSize: 20, color: "text.secondary", lineHeight: 1, mt: 0.25 }}>
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

"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { color, glass, elevation, radius } from "@/lib/theme"

interface Props {
  logoUrl: string | null
}

export function LoginForm({ logoUrl }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const matricId = form.get("matricId") as string
    const password = form.get("password") as string

    const result = await signIn("credentials", {
      matricId,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid Matric No. or password.")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 4 },
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient gradient blobs */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "radial-gradient(700px 400px at 12% 8%, rgba(145,201,83,0.18), transparent 60%), radial-gradient(800px 500px at 92% 88%, rgba(0,75,35,0.14), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 400,
          borderRadius: `${radius.sheet}px`,
          background: glass.background,
          backdropFilter: glass.backdropFilter,
          border: glass.border,
          boxShadow: elevation.e3,
          p: { xs: 3.5, sm: 4.5 },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, textAlign: "center" }}>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 48, width: "auto", objectFit: "contain" }} />
          ) : (
            <Typography
              variant="h1"
              sx={{ fontFamily: "var(--font-fraunces), serif", color: color.brand[900] }}
            >
              KIZ
            </Typography>
          )}
          <Typography variant="overline" sx={{ color: color.ink[500] }}>
            Kolej Ibu Zain · UKM
          </Typography>
          <Typography variant="body2" sx={{ color: color.ink[500], maxWidth: 300 }}>
            Sign in with your UKM Matric No. to access the college digital platform.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3.5 }}>
          <TextField
            id="matricId"
            name="matricId"
            label="Matric No."
            type="text"
            placeholder="A123456"
            autoComplete="username"
            required
          />
          <TextField
            id="password"
            name="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          {error && (
            <Alert severity="error" variant="standard">
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 0.5 }}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 3, color: color.ink[300] }}>
          Need help? Contact the KIZ management office.
        </Typography>
      </Box>
    </Box>
  )
}

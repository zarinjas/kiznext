"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { resetUserPassword } from "./actions"

interface Props {
  user: { id: string; name: string; matricId: string }
  onClose: () => void
}

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
const SYMBOLS = "!@#$%&*+="

function generatePassword(length = 10): string {
  const chars: string[] = []
  for (let i = 0; i < length; i++) {
    chars.push(CHARSET[Math.floor(Math.random() * CHARSET.length)])
  }
  // Guarantee at least one digit and one symbol.
  chars[0] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  chars[1] = "23456789"[Math.floor(Math.random() * 8)]
  return chars.join("")
}

export function ResetPasswordDialog({ user, onClose }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState(() => generatePassword())
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await resetUserPassword(user.id, password)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reset the password — try again.")
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <KDialog open onClose={onClose} title="Reset Password" icon="key" maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Set a new password for <strong>{user.name}</strong> ({user.matricId}). Copy it now and
            send it to them — the password can&apos;t be viewed again afterwards.
          </Typography>

          <TextField
            label="New Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="Copy password" onClick={handleCopy} edge="end" tabIndex={-1}>
                      <KIcon icon={copied ? "check" : "content_copy"} size={19} />
                    </IconButton>
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      tabIndex={-1}
                    >
                      <KIcon icon={showPassword ? "visibility_off" : "visibility"} size={19} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" onClick={() => setPassword(generatePassword())} startIcon={<KIcon icon="refresh" size={16} />}>
              Generate another
            </Button>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button onClick={onClose} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <KButton type="submit" loading={loading} icon="key">
              {loading ? "Resetting…" : "Reset Password"}
            </KButton>
          </Box>
        </Box>
      </form>
    </KDialog>
  )
}

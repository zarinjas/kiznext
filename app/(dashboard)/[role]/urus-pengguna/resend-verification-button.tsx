"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { resendUserVerification } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  userId: string
  userName: string
}

/** Re-sends the email-verification link for an unverified self-service account. */
export function ResendVerificationButton({ userId, userName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ severity: "success" | "error"; text: string } | null>(null)

  async function handleResend() {
    setLoading(true)
    setNotice(null)
    try {
      await resendUserVerification(userId)
      setNotice({ severity: "success", text: `Verification email re-sent to ${userName}.` })
      router.refresh()
    } catch (err) {
      setNotice({ severity: "error", text: err instanceof Error ? err.message : "Couldn't send the email — try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title={loading ? "Sending…" : "Resend verification email"}>
        <span>
          <IconButton size="small" onClick={handleResend} disabled={loading} aria-label={`Resend verification email for ${userName}`}>
            <KIcon icon="forward_to_inbox" size={18} sx={{ color: color.info.main }} />
          </IconButton>
        </span>
      </Tooltip>

      <Snackbar
        open={!!notice}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={notice?.severity} variant="standard" onClose={() => setNotice(null)}>
          {notice?.text}
        </Alert>
      </Snackbar>
    </>
  )
}

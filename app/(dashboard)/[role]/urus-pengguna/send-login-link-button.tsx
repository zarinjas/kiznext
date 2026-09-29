"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { sendUserLoginLink } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  userId: string
  userName: string
  /** The account needs an email on file before a link can be sent. */
  hasEmail: boolean
}

/** Emails an admin-created account a one-time link to set its password and sign in. */
export function SendLoginLinkButton({ userId, userName, hasEmail }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<{ severity: "success" | "error"; text: string } | null>(null)

  async function handleSend() {
    setLoading(true)
    setNotice(null)
    try {
      const result = await sendUserLoginLink(userId)
      if (!result.ok) {
        setNotice({ severity: "error", text: result.error })
        return
      }
      setNotice({ severity: "success", text: `Login link sent to ${userName}.` })
      router.refresh()
    } catch (err) {
      setNotice({ severity: "error", text: err instanceof Error ? err.message : "Couldn't send the login link — try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title={hasEmail ? "Send login link" : "Add an email address first"}>
        <span>
          <IconButton
            size="small"
            onClick={handleSend}
            disabled={loading || !hasEmail}
            aria-label={`Send login link to ${userName}`}
          >
            <KIcon icon="login" size={18} sx={{ color: hasEmail ? color.info.main : "text.disabled" }} />
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

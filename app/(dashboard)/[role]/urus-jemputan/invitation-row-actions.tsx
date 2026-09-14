"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import Snackbar from "@mui/material/Snackbar"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"
import type { InvitationStatus } from "@/lib/invitations"
import { deleteInvitation, resendInvitation, revokeInvitation } from "./actions"

interface Props {
  id: string
  email: string
  status: InvitationStatus
}

/** Resend / revoke / delete controls for one invitation row. */
export function InvitationRowActions({ id, email, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<"revoke" | "delete" | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState<{ severity: "success" | "error"; text: string } | null>(null)

  const canResend = status === "pending" || status === "expired"
  const canRevoke = status === "pending"

  async function handleResend() {
    setLoading(true)
    setNotice(null)
    try {
      await resendInvitation(id)
      setNotice({ severity: "success", text: `Invitation re-sent to ${email}.` })
      router.refresh()
    } catch (err) {
      setNotice({ severity: "error", text: err instanceof Error ? err.message : "Couldn't send the email — try again." })
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!confirm) return
    setLoading(true)
    setError("")
    try {
      if (confirm === "revoke") await revokeInvitation(id)
      else await deleteInvitation(id)
      setConfirm(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that invitation — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title={canResend ? "Resend invitation" : "Already accepted or revoked"}>
        <span>
          <IconButton size="small" onClick={handleResend} disabled={loading || !canResend} aria-label={`Resend invitation to ${email}`}>
            <KIcon icon="forward_to_inbox" size={18} sx={{ color: canResend ? color.info.main : "text.disabled" }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={canRevoke ? "Revoke invitation" : "Only pending invitations can be revoked"}>
        <span>
          <IconButton size="small" onClick={() => setConfirm("revoke")} disabled={loading || !canRevoke} aria-label={`Revoke invitation for ${email}`}>
            <KIcon icon="block" size={18} sx={{ color: canRevoke ? color.warning.main : "text.disabled" }} />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Delete">
        <span>
          <IconButton size="small" onClick={() => setConfirm("delete")} disabled={loading} sx={{ color: "error.main" }} aria-label={`Delete invitation for ${email}`}>
            <KIcon icon="delete" size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <KDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "revoke" ? "Revoke Invitation" : "Delete Invitation"}
        icon="warning"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setConfirm(null)} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              variant="contained"
              sx={{ backgroundColor: color.danger.main, "&:hover": { backgroundColor: color.danger.ink } }}
            >
              {loading ? "Working…" : confirm === "revoke" ? "Yes, Revoke" : "Yes, Delete"}
            </Button>
          </>
        }
      >
        <Typography variant="body2" sx={{ color: "text.secondary", m: 0 }}>
          {confirm === "revoke" ? (
            <>
              Revoke the invitation for <strong>{email}</strong>? The link stops working immediately, but the
              record is kept.
            </>
          ) : (
            <>
              Remove the invitation for <strong>{email}</strong> from the list? The link stops working.
            </>
          )}
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </KDialog>

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

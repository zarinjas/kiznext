"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { activateUser } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  userId: string
  userName: string
  userMatricId: string
}

/** Manually unlocks a pending (or unverified) self-service account. */
export function ActivateUserButton({ userId, userName, userMatricId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleActivate() {
    setLoading(true)
    setError("")
    try {
      await activateUser(userId)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't activate that account — try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title="Activate account">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: color.success.main }} aria-label={`Activate ${userName}`}>
          <KIcon icon="check_circle" size={18} />
        </IconButton>
      </Tooltip>

      <KDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Activate account"
        icon="verified"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setOpen(false)} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={loading}
              variant="contained"
              sx={{ backgroundColor: color.success.main, "&:hover": { backgroundColor: color.success.ink } }}
            >
              {loading ? "Activating…" : "Yes, Activate"}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "text.secondary", margin: 0 }}>
          Give <strong>{userName}</strong> ({userMatricId}) full access now? Use this only for
          accounts you have verified manually — e.g. a resident missing from the uploaded list.
        </p>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </KDialog>
    </>
  )
}

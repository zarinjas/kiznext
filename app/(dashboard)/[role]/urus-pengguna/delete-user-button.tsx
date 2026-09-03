"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { deleteUser } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  userId: string
  userName: string
  userMatricId: string
  isSelf: boolean
}

export function DeleteUserButton({ userId, userName, userMatricId, isSelf }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    setLoading(true)
    setError("")
    try {
      await deleteUser(userId)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that account — try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title={isSelf ? "You can't delete your own account" : "Delete"}>
        <span>
          <IconButton
            size="small"
            onClick={() => setOpen(true)}
            disabled={isSelf}
            sx={{ color: "error.main" }}
            aria-label={`Delete ${userName}`}
          >
            <KIcon icon="delete" size={18} />
          </IconButton>
        </span>
      </Tooltip>

      <KDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete User"
        icon="warning"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setOpen(false)} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="contained"
              sx={{ backgroundColor: color.danger.main, "&:hover": { backgroundColor: color.danger.ink } }}
            >
              {loading ? "Deleting…" : "Yes, Delete"}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "text.secondary", margin: 0 }}>
          Delete <strong>{userName}</strong> ({userMatricId})? Their account will be deactivated —
          they can no longer log in, but their past records are kept.
        </p>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </KDialog>
    </>
  )
}

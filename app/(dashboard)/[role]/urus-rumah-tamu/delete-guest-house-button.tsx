"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { deleteGuestHouse } from "./guest-house-actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  guestHouseId: string
  guestHouseName: string
}

export function DeleteGuestHouseButton({ guestHouseId, guestHouseName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    setLoading(true)
    setError("")
    try {
      await deleteGuestHouse(guestHouseId)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that — try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen(true)}
        startIcon={<KIcon icon="delete" size={15} />}
        sx={{ color: "error.main", borderColor: "divider" }}
      >
        Delete
      </Button>

      <KDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete Guest House"
        icon="warning"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setOpen(false)} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={loading} variant="contained" sx={{ backgroundColor: color.danger.main, "&:hover": { backgroundColor: color.danger.ink } }}>
              {loading ? "Deleting…" : "Yes, Delete"}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: "text.secondary", margin: 0 }}>
          Are you sure you want to delete <strong>{guestHouseName}</strong>? It will be hidden
          from students. Guest houses with active bookings cannot be deleted.
        </p>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </KDialog>
    </>
  )
}

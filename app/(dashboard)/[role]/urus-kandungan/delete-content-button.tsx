"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { deleteContentItem } from "@/lib/content"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

export function DeleteContentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteContentItem(id)
      setOpen(false)
      router.refresh()
    } catch {
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
        title="Delete Content"
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
        <Typography variant="body2" sx={{ color: "text.secondary", m: 0 }}>
          Remove <strong>{name}</strong> from the dashboard? Its widget will stop showing it. This can be undone later.
        </Typography>
      </KDialog>
    </>
  )
}

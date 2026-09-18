"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { deleteSocialLink } from "@/lib/stay-connected"
import { color } from "@/lib/theme"

export function DeleteLinkButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteSocialLink(id)
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
        aria-label={`Delete ${name}`}
        sx={{ minWidth: 0, px: 1, color: "error.main", borderColor: "divider" }}
      >
        <KIcon icon="delete" size={15} />
      </Button>

      <KDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete Link"
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
          Remove <strong>{name}</strong> from the Stay Connected section? This can be undone later.
        </Typography>
      </KDialog>
    </>
  )
}

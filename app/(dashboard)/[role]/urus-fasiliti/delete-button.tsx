"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { deleteFacility } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  facilityId: string
  facilityName: string
}

export function DeleteButton({ facilityId, facilityName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteFacility(facilityId)
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
        title="Delete Facility"
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
          Are you sure you want to delete <strong>{facilityName}</strong>? This facility will be
          hidden from students. This action can be reversed by contacting a super admin.
        </p>
      </KDialog>
    </>
  )
}

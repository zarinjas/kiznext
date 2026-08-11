"use client"

import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { cancelGHBooking } from "@/app/(dashboard)/[role]/rumah-tamu/actions"
import { useState } from "react"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  bookingId: string
}

export function CancelGHButton({ bookingId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!window.confirm("Cancel this booking?")) return
    setLoading(true)
    try {
      await cancelGHBooking(bookingId)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={handleCancel}
      disabled={loading}
      startIcon={<KIcon icon="close" size={15} />}
      sx={{ color: "error.main", borderColor: "divider" }}
    >
      {loading ? "Cancelling…" : "Cancel"}
    </Button>
  )
}

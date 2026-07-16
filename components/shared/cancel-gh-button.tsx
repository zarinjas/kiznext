"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cancelGHBooking } from "../../app/(dashboard)/[role]/rumah-tamu/actions"
import { useState } from "react"

interface Props {
  bookingId: string
}

export function CancelGHButton({ bookingId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    if (!confirm("Cancel this booking?")) return
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
    <Button size="xs" variant="outline" onClick={handleCancel} disabled={loading}>
      {loading ? "..." : "Cancel"}
    </Button>
  )
}

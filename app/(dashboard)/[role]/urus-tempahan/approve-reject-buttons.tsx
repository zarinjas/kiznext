"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { approveBooking, rejectBooking } from "./actions"

interface Props {
  bookingId: string
}

export function ApproveRejectButtons({ bookingId }: Props) {
  const router = useRouter()

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={async () => {
          await approveBooking(bookingId)
          router.refresh()
        }}
      >
        Lulus
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={async () => {
          await rejectBooking(bookingId)
          router.refresh()
        }}
      >
        Tolak
      </Button>
    </div>
  )
}

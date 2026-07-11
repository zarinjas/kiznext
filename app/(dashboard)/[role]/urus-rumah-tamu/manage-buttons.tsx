"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { approveGH, rejectGH, checkInGH, checkOutGH, markPaidGH } from "./actions"

interface Props {
  bookingId: string
  status: string
}

export function GHManageButtons({ bookingId, status }: Props) {
  const router = useRouter()

  async function action(fn: (id: string) => Promise<void>) {
    await fn(bookingId)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending" && (
        <>
          <Button size="xs" onClick={() => action(approveGH)}>Lulus</Button>
          <Button size="xs" variant="destructive" onClick={() => action(rejectGH)}>Tolak</Button>
        </>
      )}
      {status === "approved" && (
        <Button size="xs" onClick={() => action(checkInGH)}>Check-In</Button>
      )}
      {status === "checked_in" && (
        <>
          <Button size="xs" onClick={() => action(checkOutGH)}>Check-Out</Button>
          <Button size="xs" variant="outline" onClick={() => action(markPaidGH)}>
            Tanda Bayar
          </Button>
        </>
      )}
    </div>
  )
}

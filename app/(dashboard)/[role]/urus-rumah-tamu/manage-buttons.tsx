"use client"

import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { approveGH, rejectGH, checkInGH, checkOutGH, markPaidGH } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"

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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {status === "pending" && (
        <>
          <Button size="small" variant="contained" onClick={() => action(approveGH)} startIcon={<KIcon icon="check" size={15} />}>
            Approve
          </Button>
          <Button size="small" variant="outlined" onClick={() => action(rejectGH)} startIcon={<KIcon icon="close" size={15} />} sx={{ color: "error.main", borderColor: "divider" }}>
            Reject
          </Button>
        </>
      )}
      {status === "approved" && (
        <Button size="small" variant="contained" onClick={() => action(checkInGH)} startIcon={<KIcon icon="login" size={15} />}>
          Check-In
        </Button>
      )}
      {status === "checked_in" && (
        <>
          <Button size="small" variant="contained" onClick={() => action(checkOutGH)} startIcon={<KIcon icon="logout" size={15} />}>
            Check-Out
          </Button>
          <Button size="small" variant="outlined" onClick={() => action(markPaidGH)} startIcon={<KIcon icon="payments" size={15} />}>
            Mark Paid
          </Button>
        </>
      )}
    </div>
  )
}

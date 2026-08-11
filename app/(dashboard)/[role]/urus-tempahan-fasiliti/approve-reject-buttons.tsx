"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"

/** Approve/Reject for facility bookings — inline row actions. */
export function ApproveRejectButtons({
  bookingId,
  approve,
  reject,
}: {
  bookingId: string
  approve: (id: string) => Promise<void>
  reject: (id: string) => Promise<void>
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)

  async function run(fn: (id: string) => Promise<void>, which: "approve" | "reject") {
    setBusy(which)
    try {
      await fn(bookingId)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button
        size="small"
        variant="contained"
        disabled={busy !== null}
        onClick={() => run(approve, "approve")}
        startIcon={busy === "approve" ? undefined : <KIcon icon="check" size={16} />}
      >
        {busy === "approve" ? "…" : "Approve"}
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={busy !== null}
        onClick={() => run(reject, "reject")}
        startIcon={busy === "reject" ? undefined : <KIcon icon="close" size={16} />}
        sx={{ color: "error.main", borderColor: "divider" }}
      >
        {busy === "reject" ? "…" : "Reject"}
      </Button>
    </div>
  )
}

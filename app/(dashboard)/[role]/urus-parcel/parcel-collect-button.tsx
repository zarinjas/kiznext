"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { markCollected } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"

export function ParcelCollectButton({ parcelId }: { parcelId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  return (
    <Button
      size="small"
      variant="outlined"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await markCollected(parcelId)
          router.refresh()
        } finally {
          setLoading(false)
        }
      }}
      startIcon={<KIcon icon="check" size={15} />}
      sx={{ color: "success.main", borderColor: "divider" }}
    >
      {loading ? "…" : "Mark collected"}
    </Button>
  )
}

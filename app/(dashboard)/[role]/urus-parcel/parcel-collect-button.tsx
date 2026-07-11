"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markCollected } from "./actions"

export function ParcelCollectButton({ parcelId }: { parcelId: string }) {
  const router = useRouter()

  return (
    <Button
      size="xs"
      variant="outline"
      onClick={async () => {
        await markCollected(parcelId)
        router.refresh()
      }}
    >
      Ambil
    </Button>
  )
}

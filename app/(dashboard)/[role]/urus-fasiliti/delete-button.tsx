"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteFacility } from "./actions"

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
        size="xs"
        variant="destructive"
        onClick={() => setOpen(true)}
      >
        Padam
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
            <h3 className="font-heading text-lg text-primary-foreground">
              Padam Fasiliti
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Adakah anda pasti mahu memadam <strong>{facilityName}</strong>?
              Fasiliti ini akan disembunyikan daripada pelajar. Tindakan ini boleh
              diundur dengan menghubungi super admin.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Memadam..." : "Ya, Padam"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

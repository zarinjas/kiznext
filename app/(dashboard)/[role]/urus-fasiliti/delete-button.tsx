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
        Delete
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
            <h3 className="font-heading text-lg text-primary-foreground">
              Delete Facility
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{facilityName}</strong>?
              This facility will be hidden from students. This action can be
              reversed by contacting a super admin.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

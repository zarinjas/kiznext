"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBooking } from "../actions"

interface Props {
  facilityId: string
  requiresApproval: boolean
  role: string
}

export function BookingForm({ facilityId, requiresApproval, role }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const date = form.get("date") as string
    const startTime = form.get("startTime") as string
    const endTime = form.get("endTime") as string

    const start = `${date}T${startTime}:00`
    const end = `${date}T${endTime}:00`

    if (new Date(start) >= new Date(end)) {
      setError("Masa tamat mesti selepas masa mula.")
      setLoading(false)
      return
    }

    try {
      await createBooking(facilityId, start, end)
      setSuccess(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ralat berlaku.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <p className="text-green-600 font-medium">Tempahan berjaya dihantar!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {requiresApproval
            ? "Tempahan anda sedang menunggu kelulusan admin."
            : "Tempahan anda telah disahkan."}
        </p>
        <Button className="mt-4 w-full" onClick={() => router.push(`/${role}/tempahan`)}>
          Kembali
        </Button>
      </div>
    )
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="date">Tarikh</Label>
        <Input
          id="date"
          name="date"
          type="date"
          min={minDate}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Masa Mula</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue="08:00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Masa Tamat</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue="09:00"
            required
          />
        </div>
      </div>
      {requiresApproval && (
        <p className="text-xs text-muted-foreground">
          Fasiliti ini memerlukan kelulusan admin. Tempahan akan disemak sebelum disahkan.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Memproses..." : "Hantar Tempahan"}
      </Button>
    </form>
  )
}

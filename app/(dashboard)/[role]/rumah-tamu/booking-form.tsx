"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createGHBooking, cancelGHBooking } from "./actions"

interface Props {
  role: string
}

export function GHBookingForm({ role }: Props) {
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

    try {
      await createGHBooking(form)
      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <p className="text-green-600 font-medium">Booking submitted!</p>
        <p className="mt-1 text-sm text-muted-foreground">Pending admin approval.</p>
        <Button className="mt-4 w-full" onClick={() => router.push(`/${role}/rumah-tamu`)}>
          Back
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
        <Label htmlFor="guestName">Guest Name</Label>
        <Input
          id="guestName"
          name="guestName"
          placeholder="Full name of guest"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="periodType">Booking Type</Label>
        <select
          id="periodType"
          name="periodType"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          required
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            min={minDate}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            min={minDate}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Example: guest will arrive at 3 PM..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Processing..." : "Submit Booking"}
      </Button>
    </form>
  )
}

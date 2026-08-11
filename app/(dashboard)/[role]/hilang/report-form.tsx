"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { reportItem } from "./actions"

interface Props {
  role: string
}

export function ReportForm({ role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    try {
      await reportItem(form)
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="status">Type</Label>
        <select id="status" name="status" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
          <option value="lost">Lost Item</option>
          <option value="found">I Found an Item</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="itemName">Item Name</Label>
        <Input id="itemName" name="itemName" placeholder="e.g. Black wallet" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" rows={3} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Describe the item..." required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="locationFound">Location (optional)</Label>
        <Input id="locationFound" name="locationFound" placeholder="e.g. KIZ canteen" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="photo">Photo (optional)</Label>
        <input id="photo" name="photo" type="file" accept="image/*" className="w-full text-sm" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Submitting..." : "Report"}
      </Button>
    </form>
  )
}

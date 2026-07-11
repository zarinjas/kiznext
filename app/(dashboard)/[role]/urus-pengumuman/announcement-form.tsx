"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAnnouncement } from "./actions"

interface Props {
  role: string
}

export function AnnouncementForm({ role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    await createAnnouncement(
      form.get("title") as string,
      form.get("content") as string,
      form.get("tag") as string,
    )
    setLoading(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tag">Tag</Label>
        <select id="tag" name="tag" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
          <option value="umum">Umum</option>
          <option value="penting">Penting</option>
          <option value="sukan">Sukan</option>
          <option value="acara">Acara</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Tajuk</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Kandungan</Label>
        <textarea id="content" name="content" rows={4} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Menyiarkan..." : "Siarkan"}
      </Button>
    </form>
  )
}

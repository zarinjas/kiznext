"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "./actions"

interface Props {
  role: string
  edit?: {
    id: string
    title: string
    content: string
    tag: string
    attachmentUrl: string | null
    attachmentType: string | null
    isPinned: boolean
    scheduledAt: string | null
    expiresAt: string | null
  } | null
}

export function AnnouncementForm({ role, edit }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState(edit?.attachmentUrl || "")
  const [attachmentType, setAttachmentType] = useState(edit?.attachmentType || "")
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      setAttachmentUrl(data.url)
      const isImage = file.type.startsWith("image/")
      setAttachmentType(isImage ? "image" : "pdf")
    } catch {
      alert("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const title = form.get("title") as string
    const content = form.get("content") as string
    const tag = form.get("tag") as string
    const isPinned = form.get("isPinned") === "on"
    const scheduledAt = (form.get("scheduledAt") as string) || null
    const expiresAt = (form.get("expiresAt") as string) || null

    if (edit) {
      await updateAnnouncement(edit.id, title, content, tag, attachmentUrl || null, attachmentType || null, isPinned, scheduledAt, expiresAt)
    } else {
      await createAnnouncement(title, content, tag, attachmentUrl || null, attachmentType || null, isPinned, scheduledAt, expiresAt)
    }

    setLoading(false)
    router.refresh()
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tag">Tag</Label>
        <select id="tag" name="tag" defaultValue={edit?.tag || "general"} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
          <option value="general">General</option>
          <option value="important">Important</option>
          <option value="sports">Sports</option>
          <option value="event">Event</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={edit?.title} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <textarea id="content" name="content" rows={4} defaultValue={edit?.content} className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
      </div>

      {/* Attachment upload */}
      <div className="space-y-2">
        <Label>Attachment (PDF/Image) — optional</Label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleUpload}
          disabled={uploading}
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:text-primary-foreground"
        />
        {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        {attachmentUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-2 text-xs">
            <span className="truncate flex-1">{attachmentType === "pdf" ? "📎 PDF" : "🖼️ Image"}</span>
            <button type="button" onClick={() => { setAttachmentUrl(""); setAttachmentType("") }} className="text-destructive hover:underline">Delete</button>
          </div>
        )}
        <input type="hidden" name="attachmentUrl" value={attachmentUrl} />
      </div>

      {/* Pin toggle */}
      <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer">
        <input type="checkbox" name="isPinned" defaultChecked={edit?.isPinned} className="size-4 accent-[#004B23]" />
        <div>
          <p className="text-sm font-medium text-foreground">📌 Pin this announcement</p>
          <p className="text-xs text-muted-foreground">Important announcements will always stay on top</p>
        </div>
      </label>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Schedule Publish (optional)</Label>
          <Input id="scheduledAt" name="scheduledAt" type="date" min={minDate} defaultValue={edit?.scheduledAt?.split("T")[0] || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expires (optional)</Label>
          <Input id="expiresAt" name="expiresAt" type="date" min={minDate} defaultValue={edit?.expiresAt?.split("T")[0] || ""} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Processing..." : edit ? "Save" : "Publish"}
        </Button>
        {edit && (
          <Button type="button" variant="destructive" onClick={async () => {
            if (confirm("Delete this announcement?")) {
              await deleteAnnouncement(edit.id)
              router.refresh()
            }
          }}>
            Delete
          </Button>
        )}
      </div>
    </form>
  )
}

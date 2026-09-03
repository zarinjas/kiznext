"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"

import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import Button from "@mui/material/Button"
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

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
  onDone?: () => void
}

export function AnnouncementForm({ role: _role, edit, onDone }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState(edit?.attachmentUrl || "")
  const [attachmentType, setAttachmentType] = useState(edit?.attachmentType || "")
  const [uploading, setUploading] = useState(false)

  // min date is applied after mount so the SSR HTML and the first client render
  // agree (avoids a hydration mismatch on the `min` attribute near midnight).
  const [minDate, setMinDate] = useState("")
  useEffect(() => {
    const id = window.setTimeout(() => {
      const t = new Date()
      t.setDate(t.getDate() + 1)
      setMinDate(t.toISOString().split("T")[0])
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

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
      alert("That file didn't upload — try again.")
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

    try {
      if (edit) {
        await updateAnnouncement(edit.id, title, content, tag, attachmentUrl || null, attachmentType || null, isPinned, scheduledAt, expiresAt)
      } else {
        await createAnnouncement(title, content, tag, attachmentUrl || null, attachmentType || null, isPinned, scheduledAt, expiresAt)
      }
    } finally {
      setLoading(false)
      router.refresh()
      onDone?.()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="tag" name="tag" label="Tag" select required defaultValue={edit?.tag || "general"}>
          <MenuItem value="general">General</MenuItem>
          <MenuItem value="important">Important</MenuItem>
          <MenuItem value="sports">Sports</MenuItem>
          <MenuItem value="event">Event</MenuItem>
        </TextField>
        <TextField id="title" name="title" label="Title" defaultValue={edit?.title} required />
        <TextField id="content" name="content" label="Content" multiline minRows={4} defaultValue={edit?.content} required />

        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>
            Attachment (PDF/Image) — optional
          </Box>
          <Button component="label" variant="outlined" startIcon={<KIcon icon="attach_file" size={16} />} disabled={uploading}>
            {uploading ? "Uploading…" : "Choose file"}
            <input type="file" accept="image/*,.pdf" hidden onChange={handleUpload} disabled={uploading} />
          </Button>
          {attachmentUrl && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, p: 1, borderRadius: 1.5, backgroundColor: "action.hover", fontSize: 12.5 }}>
              <KIcon icon={attachmentType === "pdf" ? "description" : "image"} size={16} />
              <Box component="span" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {attachmentType === "pdf" ? "PDF" : "Image"}
              </Box>
              <Button
                size="small"
                onClick={() => { setAttachmentUrl(""); setAttachmentType("") }}
                sx={{ color: "error.main", minHeight: 0, fontSize: 12 }}
              >
                Remove
              </Button>
            </Box>
          )}
          <input type="hidden" name="attachmentUrl" value={attachmentUrl} />
        </Box>

        <FormControlLabel
          control={<Switch name="isPinned" defaultChecked={edit?.isPinned} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: color.brand[600] }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: color.brand[600] } }} />}
          label={<Box>
            <Box sx={{ fontSize: 14, fontWeight: 600 }}>Pin this announcement</Box>
            <Box sx={{ fontSize: 12, color: "text.secondary" }}>Important announcements always stay on top</Box>
          </Box>}
          sx={{ mx: 0 }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField id="scheduledAt" name="scheduledAt" label="Schedule Publish (optional)" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }} defaultValue={edit?.scheduledAt?.split("T")[0] || ""} />
          <TextField id="expiresAt" name="expiresAt" label="Expires (optional)" type="date" slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: minDate } }} defaultValue={edit?.expiresAt?.split("T")[0] || ""} />
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <KButton type="submit" loading={loading} icon={edit ? "save" : "campaign"} sx={{ flex: 1 }}>
            {loading ? "Processing…" : edit ? "Save" : "Publish"}
          </KButton>
          {edit && (
            <Button
              variant="outlined"
              onClick={async () => {
                if (window.confirm("Delete this announcement?")) {
                  await deleteAnnouncement(edit.id)
                  router.refresh()
                }
              }}
              sx={{ color: "error.main", borderColor: "divider" }}
            >
              Delete
            </Button>
          )}
        </Box>
      </Box>
    </form>
  )
}

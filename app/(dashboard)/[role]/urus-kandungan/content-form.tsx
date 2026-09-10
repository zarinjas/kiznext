"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { createContentItem, updateContentItem, type ContentItemInput } from "@/lib/content"
import { CONTENT_KIND_OPTIONS, CONTENT_KIND_META } from "@/lib/content-meta"
import type { ContentKind } from "@/app/generated/prisma/client"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface ContentItemView {
  id: string
  kind: ContentKind
  title: string
  subtitle: string | null
  body: string | null
  phone: string | null
  link: string | null
  sortOrder: number
}

interface Props {
  initial?: ContentItemView | null
  onClose?: () => void
}

export function ContentForm({ initial, onClose }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)

  const [kind, setKind] = useState<ContentKind>(initial?.kind ?? "emergency_contact")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [link, setLink] = useState(initial?.link ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = CONTENT_KIND_META[kind]
  const isContact = kind === "emergency_contact"

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    if (!title.trim()) {
      setError("Give this item a title.")
      setLoading(false)
      return
    }
    if (isContact && !phone.trim()) {
      setError("An emergency contact needs a phone number.")
      setLoading(false)
      return
    }
    const data: ContentItemInput = {
      kind,
      title,
      subtitle,
      body,
      phone: isContact ? phone : null,
      link: isContact ? null : link,
      sortOrder: parseInt(sortOrder, 10) || 0,
    }
    try {
      if (isEditing && initial) {
        await updateContentItem(initial.id, data)
      } else {
        await createContentItem(data)
      }
      router.refresh()
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, borderRadius: 2, backgroundColor: color.info.soft, color: color.info.ink, fontSize: 12.5 }}>
        <KIcon icon="info" size={16} sx={{ flexShrink: 0, marginTop: 1 }} />
        <Box>{meta.hint}</Box>
      </Box>

      <TextField select label="Type" value={kind} size="medium" onChange={(e) => setKind(e.target.value as ContentKind)} disabled={isEditing}>
        {CONTENT_KIND_OPTIONS.map((k) => (
          <MenuItem key={k} value={k}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <KIcon icon={CONTENT_KIND_META[k].icon} size={17} />
              {CONTENT_KIND_META[k].label}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      <TextField label={isContact ? "Name / role" : "Title"} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isContact ? "e.g. Security Guard Post" : "e.g. Resident Handbook"} size="medium" required />

      {isContact ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 03-8921 4000" size="medium" />
          <TextField label="Caption" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. 24 hours · Front gate" size="medium" />
        </Box>
      ) : (
        <TextField label="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://… or /pengumuman" size="medium" />
      )}

      <TextField label="Description" value={body} onChange={(e) => setBody(e.target.value)} size="medium" multiline minRows={2} placeholder="Optional — a short line shown on the card." />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} size="medium" type="number" />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: 999, backgroundColor: color.brand[50], color: color.brand[800], fontSize: 12, fontWeight: 600 }}>
            <KIcon icon={meta.icon} size={15} />
            {meta.label}
          </Box>
        </Box>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: "error.main" }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <KButton loading={loading} icon={isEditing ? "save" : "add"} onClick={handleSubmit}>
          {isEditing ? "Save Changes" : "Add Content"}
        </KButton>
      </Box>
    </Box>
  )
}

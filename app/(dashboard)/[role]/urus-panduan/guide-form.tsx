"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"
import { GUIDE_CATEGORIES, GUIDE_CATEGORY_META } from "@/lib/guide-meta"
import { getPdfPageCount } from "@/lib/pdf-client"
import { createGuide, updateGuide, type GuideInput } from "@/lib/guides"
import type { GuideCategory } from "@/app/generated/prisma/client"
import type { GuideView } from "./guides-admin"

interface Props {
  initial?: GuideView | null
  onClose?: () => void
}

export function GuideForm({ initial, onClose }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)

  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [category, setCategory] = useState<GuideCategory>(initial?.category ?? "orientation")
  const [published, setPublished] = useState(initial?.published ?? true)
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false)
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))

  const [fileUrl, setFileUrl] = useState(initial?.fileUrl ?? "")
  const [fileSize, setFileSize] = useState<number | null>(initial?.fileSize ?? null)
  const [pageCount, setPageCount] = useState<number | null>(initial?.pageCount ?? null)
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "")

  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("dir", "guides")
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok || !data.url) throw new Error(data.error || "That file didn't upload — try again.")
    return data.url as string
  }

  async function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    setError(null)
    try {
      const url = await upload(file)
      setFileUrl(url)
      setFileSize(file.size)
      setPageCount(await getPdfPageCount(url))
    } catch (err) {
      setError(err instanceof Error ? err.message : "That file didn't upload — try again.")
    } finally {
      setUploadingPdf(false)
      e.target.value = ""
    }
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    setError(null)
    try {
      setCoverImage(await upload(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : "That image didn't upload — try again.")
    } finally {
      setUploadingCover(false)
      e.target.value = ""
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Give the guide a title.")
      return
    }
    if (!fileUrl) {
      setError("Upload the PDF first.")
      return
    }
    setLoading(true)
    setError(null)
    const data: GuideInput = {
      title,
      description,
      category,
      fileUrl,
      fileSize,
      coverImage: coverImage || null,
      pageCount,
      published,
      isPinned,
      sortOrder: Number(sortOrder) || 0,
    }
    try {
      if (isEditing && initial) {
        await updateGuide(initial.id, data)
      } else {
        await createGuide(data)
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
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. KIZ Orientation Guide 2026" required />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        multiline
        minRows={2}
        placeholder="Optional — one line on what this guide covers."
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Category" select value={category} onChange={(e) => setCategory(e.target.value as GuideCategory)}>
          {GUIDE_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {GUIDE_CATEGORY_META[c].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          helperText="Lower numbers appear first."
        />
      </Box>

      <Box>
        <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>PDF document *</Box>
        <Button
          component="label"
          variant="outlined"
          startIcon={<KIcon icon="picture_as_pdf" size={16} />}
          disabled={uploadingPdf}
        >
          {uploadingPdf ? "Uploading…" : fileUrl ? "Replace PDF" : "Choose PDF"}
          <input type="file" accept="application/pdf,.pdf" hidden onChange={handlePdf} disabled={uploadingPdf} />
        </Button>
        {fileUrl && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, p: 1, borderRadius: 1.5, backgroundColor: "action.hover", fontSize: 12.5 }}>
            <KIcon icon="description" size={16} sx={{ color: color.brand[700] }} />
            <Box component="span" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pageCount ? `${pageCount} pages · ` : ""}
              {fileSize ? `${(fileSize / 1024 / 1024).toFixed(1)} MB` : "PDF ready"}
            </Box>
            <Button
              size="small"
              component="a"
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              sx={{ minHeight: 0, fontSize: 12 }}
            >
              Preview
            </Button>
            <Button
              size="small"
              onClick={() => {
                setFileUrl("")
                setFileSize(null)
                setPageCount(null)
              }}
              sx={{ color: "error.main", minHeight: 0, fontSize: 12 }}
            >
              Remove
            </Button>
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Cover image — optional</Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {coverImage && (
            <Box
              component="img"
              src={coverImage}
              alt=""
              sx={{ width: 44, height: 60, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
            />
          )}
          <Button
            component="label"
            variant="outlined"
            startIcon={<KIcon icon="image" size={16} />}
            disabled={uploadingCover}
          >
            {uploadingCover ? "Uploading…" : coverImage ? "Replace cover" : "Upload cover"}
            <input type="file" accept="image/*" hidden onChange={handleCover} disabled={uploadingCover} />
          </Button>
          {coverImage && (
            <Button size="small" onClick={() => setCoverImage("")} sx={{ color: "error.main" }}>
              Remove
            </Button>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <FormControlLabel
          control={<Switch checked={published} onChange={(e) => setPublished(e.target.checked)} />}
          label={
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 600 }}>Published</Box>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>Visible to residents in the Digital Guide library.</Box>
            </Box>
          }
          sx={{ mx: 0 }}
        />
        <FormControlLabel
          control={<Switch checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />}
          label={
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 600 }}>Pin to top</Box>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>Keep this guide at the top of the library.</Box>
            </Box>
          }
          sx={{ mx: 0 }}
        />
      </Box>

      {error && (
        <Box sx={{ fontSize: 13, color: "error.main" }}>{error}</Box>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <KButton loading={loading} icon={isEditing ? "save" : "upload_file"} onClick={handleSubmit}>
          {isEditing ? "Save Changes" : "Upload Guide"}
        </KButton>
      </Box>
    </Box>
  )
}

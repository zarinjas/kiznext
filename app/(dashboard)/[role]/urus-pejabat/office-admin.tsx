"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Slider from "@mui/material/Slider"
import Button from "@mui/material/Button"
import {
  updateOffice,
  uploadOfficeImage,
  removeOfficeImage,
  updateBlockPanorama,
  uploadBlockPanorama,
  removeBlockPanorama,
} from "@/lib/offices"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { Surface } from "@/components/kiz/primitives/list-group"
import { color } from "@/lib/theme"

interface OfficeView {
  id: string
  name: string
  description: string | null
  featuredImage: string | null
  gallery: string[]
}

interface BlockView {
  id: string
  name: string
  panoramaImage: string | null
  panoramaLeftX: number
  panoramaRightX: number
}

interface Props {
  offices: OfficeView[]
  blocks: BlockView[]
}

const MAX_SIZE = 12 * 1024 * 1024

function ImageThumb({ src, onRemove, alt }: { src: string; onRemove: () => void; alt: string }) {
  return (
    <Box
      sx={{
        position: "relative",
        width: 80,
        height: 80,
        borderRadius: 1.5,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        flexShrink: 0,
      }}
    >
      <Box component="img" src={src} alt={alt} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Box
        component="button"
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        sx={{
          position: "absolute",
          top: 2,
          right: 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "none",
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        ×
      </Box>
    </Box>
  )
}

function OfficeEditor({ office }: { office: OfficeView }) {
  const router = useRouter()
  const [name, setName] = useState(office.name)
  const [description, setDescription] = useState(office.description ?? "")
  const [featured, setFeatured] = useState<string | null>(office.featuredImage)
  const [gallery, setGallery] = useState<string[]>(office.gallery)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      setError("That file's a bit chunky — keep it under 12MB.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const res = await uploadOfficeImage(office.id, "featured", file)
      if (res.success && res.url) setFeatured(res.url)
      else setError(res.error ?? "Upload didn't go through — try again.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload didn't go through — try again.")
    } finally {
      setUploading(false)
    }
    router.refresh()
  }

  async function handleGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (files.some((f) => f.size > MAX_SIZE)) {
      setError("One or more files are over 12MB — trim them down.")
      return
    }
    setUploading(true)
    setError(null)
    const added: string[] = []
    try {
      for (const file of files) {
        const res = await uploadOfficeImage(office.id, "gallery", file)
        if (res.success && res.url) added.push(res.url)
        else setError(res.error ?? "Upload didn't go through — try again.")
      }
      if (added.length > 0) setGallery((prev) => [...prev, ...added])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload didn't go through — try again.")
    } finally {
      setUploading(false)
    }
    router.refresh()
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateOffice(office.id, { name: name.trim() || office.name, description })
    } catch {
      setError("Couldn't save — try again.")
    } finally {
      setSaving(false)
    }
    router.refresh()
  }

  return (
    <Surface padded>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[50],
              color: color.brand[700],
              flexShrink: 0,
            }}
          >
            <KIcon icon="domain" size={19} />
          </Box>
          <Typography sx={{ fontWeight: 650, letterSpacing: "-0.015em" }}>{office.name}</Typography>
        </Box>

        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
        <TextField
          label="What this office handles"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={2}
          size="small"
          placeholder="Describe the office function students should know…"
        />

        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Featured image</Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />} disabled={uploading}>
              {uploading ? "Uploading…" : "Choose"}
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleFeatured} />
            </Button>
            {featured && (
              <ImageThumb src={featured} alt="Featured" onRemove={async () => {
                setError(null)
                try {
                  const res = await removeOfficeImage(office.id, "featured")
                  if (!res.success) setError(res.error ?? "Couldn't remove it — try again.")
                  else setFeatured(null)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't remove it — try again.")
                }
                router.refresh()
              }} />
            )}
          </Box>
        </Box>

        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Photo gallery</Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {gallery.map((url, i) => (
              <ImageThumb
                key={i}
                src={url}
                alt={`Gallery ${i + 1}`}
                onRemove={async () => {
                  setError(null)
                  try {
                    const res = await removeOfficeImage(office.id, "gallery", i)
                    if (!res.success) setError(res.error ?? "Couldn't remove it — try again.")
                    else setGallery((prev) => prev.filter((_, idx) => idx !== i))
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Couldn't remove it — try again.")
                  }
                  router.refresh()
                }}
              />
            ))}
            <Button
              component="label"
              variant="outlined"
              disabled={uploading}
              sx={{ width: 80, height: 80, borderRadius: 1.5, color: "text.secondary", minWidth: 0 }}
            >
              <KIcon icon="add" size={18} />
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleGallery} />
            </Button>
          </Box>
        </Box>

        {error && <Typography variant="caption" sx={{ color: "error.main" }}>{error}</Typography>}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <KButton loading={saving} icon="save" onClick={handleSave}>
            Save
          </KButton>
        </Box>
      </Box>
    </Surface>
  )
}

function PanoramaEditor({ blocks }: { blocks: BlockView[] }) {
  const router = useRouter()
  const defaultBlock =
    blocks.find((b) => b.panoramaImage) ??
    blocks.find((b) => b.name.toLowerCase().includes("pentadbiran")) ??
    blocks[0]
  const [blockId, setBlockId] = useState<string | null>(defaultBlock?.id ?? null)
  const block = blocks.find((b) => b.id === blockId) ?? null
  const [panorama, setPanorama] = useState<string | null>(block?.panoramaImage ?? null)
  const [leftX, setLeftX] = useState(block?.panoramaLeftX ?? 20)
  const [rightX, setRightX] = useState(block?.panoramaRightX ?? 80)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectBlock(id: string) {
    setBlockId(id)
    const b = blocks.find((x) => x.id === id)
    setPanorama(b?.panoramaImage ?? null)
    setLeftX(b?.panoramaLeftX ?? 20)
    setRightX(b?.panoramaRightX ?? 80)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !blockId) return
    if (file.size > MAX_SIZE) {
      setError("That file's a bit chunky — keep it under 12MB.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const res = await uploadBlockPanorama(blockId, file)
      if (res.success && res.url) setPanorama(res.url)
      else setError(res.error ?? "Upload didn't go through — try again.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload didn't go through — try again.")
    } finally {
      setUploading(false)
    }
    router.refresh()
  }

  async function handleSave() {
    if (!blockId) return
    setSaving(true)
    setError(null)
    try {
      await updateBlockPanorama(blockId, { panoramaLeftX: leftX, panoramaRightX: rightX })
    } catch {
      setError("Couldn't save — try again.")
    } finally {
      setSaving(false)
    }
    router.refresh()
  }

  return (
    <Surface padded>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[50],
              color: color.brand[700],
              flexShrink: 0,
            }}
          >
            <KIcon icon="360" size={19} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 650, letterSpacing: "-0.015em" }}>Block panorama</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              One wide shot covering both offices — drag-to-explore on the student page.
            </Typography>
          </Box>
        </Box>

        <TextField select label="Block" value={blockId ?? ""} size="small" onChange={(e) => selectBlock(e.target.value)}>
          {blocks.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>

        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Panorama image</Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />} disabled={uploading || !blockId}>
              {uploading ? "Uploading…" : "Choose panorama"}
              <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleUpload} />
            </Button>
            {panorama && (
              <ImageThumb src={panorama} alt="Panorama" onRemove={async () => {
                if (!blockId) return
                setError(null)
                try {
                  const res = await removeBlockPanorama(blockId)
                  if (!res.success) setError(res.error ?? "Couldn't remove it — try again.")
                  else setPanorama(null)
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Couldn't remove it — try again.")
                }
                router.refresh()
              }} />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 0.5 }}>Left label position · {leftX}%</Box>
            <Slider value={leftX} min={0} max={100} onChange={(_, v) => setLeftX(v as number)} />
          </Box>
          <Box>
            <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 0.5 }}>Right label position · {rightX}%</Box>
            <Slider value={rightX} min={0} max={100} onChange={(_, v) => setRightX(v as number)} />
          </Box>
        </Box>

        {error && <Typography variant="caption" sx={{ color: "error.main" }}>{error}</Typography>}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <KButton loading={saving} icon="save" onClick={handleSave} disabled={!blockId}>
            Save positions
          </KButton>
        </Box>
      </Box>
    </Surface>
  )
}

export function OfficeAdmin({ offices, blocks }: Props) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box>
        <Typography sx={{ fontWeight: 650, mb: 1.5 }}>Offices</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {offices.map((office) => (
            <OfficeEditor key={office.id} office={office} />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 650, mb: 1.5 }}>Interactive panorama</Typography>
        <PanoramaEditor blocks={blocks} />
      </Box>

      <Typography variant="caption" sx={{ color: "text.disabled" }}>
        Tip: the panorama should be one wide shot with the KIZ administration office on the left and the UKM Real
        Estate office on the right — the labels sit at the percentages above.
      </Typography>
    </Box>
  )
}

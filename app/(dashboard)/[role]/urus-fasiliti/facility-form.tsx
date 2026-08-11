"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"

import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import Button from "@mui/material/Button"
import { createFacility, updateFacility, type FacilityFormData } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { color } from "@/lib/theme"

interface BlockOption {
  id: string
  name: string
}

interface Props {
  role: string
  blocks: BlockOption[]
  initialData?: {
    id: string
    name: string
    blockId: string
    description: string
    featuredImage: string | null
    gallery: string[]
    price: number | null
    capacity: number | null
    timeSlotDuration: number | null
    maxPerDay: number | null
    requiresApproval: boolean
  }
  onClose?: () => void
}

export function FacilityForm({ role: _role, blocks, initialData, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(initialData?.featuredImage ?? null)
  const [gallery, setGallery] = useState<string[]>(initialData?.gallery ?? [])
  const isEditing = !!initialData

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      console.error("Upload failed")
      return null
    }
    const data = await res.json()
    return data.url as string
  }

  async function handleFeaturedImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const url = await uploadFile(file)
    if (url) setFeaturedImage(url)
    setUploading(false)
  }

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const url = await uploadFile(file)
      if (url) urls.push(url)
    }
    setGallery((prev) => [...prev, ...urls])
    setUploading(false)
  }

  function removeGalleryImage(index: number) {
    setGallery((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const data: FacilityFormData = {
      name: form.get("name") as string,
      blockId: form.get("blockId") as string,
      description: form.get("description") as string,
      featuredImage,
      gallery,
      price: form.get("price") ? parseFloat(form.get("price") as string) : null,
      capacity: form.get("capacity") ? parseInt(form.get("capacity") as string, 10) : null,
      timeSlotDuration: form.get("timeSlotDuration") ? parseInt(form.get("timeSlotDuration") as string, 10) : null,
      maxPerDay: form.get("maxPerDay") ? parseInt(form.get("maxPerDay") as string, 10) : 3,
      requiresApproval: form.get("requiresApproval") === "on",
    }

    try {
      if (isEditing) {
        await updateFacility(initialData.id, data)
      } else {
        await createFacility(data)
      }
      router.refresh()
      onClose?.()
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="name" name="name" label="Facility Name" required defaultValue={initialData?.name} placeholder="e.g. Multipurpose Hall" />
        <TextField id="blockId" name="blockId" label="Block / Location" select required defaultValue={initialData?.blockId ?? ""}>
          <MenuItem value="" disabled>Select block…</MenuItem>
          {blocks.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          id="description"
          name="description"
          label="Description"
          multiline
          minRows={3}
          required
          defaultValue={initialData?.description}
          placeholder="Describe this facility…"
        />

        {/* Featured image */}
        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Featured Image</Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />} disabled={uploading}>
              {uploading ? "Uploading…" : "Choose Image"}
              <input type="file" accept="image/*" hidden onChange={handleFeaturedImage} />
            </Button>
            {featuredImage && (
              <Box sx={{ position: "relative", width: 80, height: 80, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box component="img" src={featuredImage} alt="Featured" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <Box
                  component="button"
                  type="button"
                  onClick={() => setFeaturedImage(null)}
                  sx={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                >
                  ×
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        {/* Gallery */}
        <Box>
          <Box sx={{ fontSize: 12.5, fontWeight: 600, color: "text.secondary", mb: 1 }}>Image Gallery</Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {gallery.map((url, i) => (
              <Box key={i} sx={{ position: "relative", width: 80, height: 80, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <Box component="img" src={url} alt={`Gallery ${i + 1}`} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <Box
                  component="button"
                  type="button"
                  onClick={() => removeGalleryImage(i)}
                  sx={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", border: "none", backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                >
                  ×
                </Box>
              </Box>
            ))}
            <Button component="label" variant="outlined" sx={{ width: 80, height: 80, borderRadius: 1.5, color: "text.secondary" }} startIcon={<KIcon icon="add" size={18} />}>
              <input type="file" accept="image/*" multiple hidden onChange={handleGalleryUpload} />
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField id="price" name="price" label="Price (RM) — leave empty if free" type="number" slotProps={{ htmlInput: { step: "0.01", min: 0 } }} defaultValue={initialData?.price?.toString() ?? ""} placeholder="0.00" />
          <TextField id="capacity" name="capacity" label="Capacity (people)" type="number" slotProps={{ htmlInput: { min: 1 } }} defaultValue={initialData?.capacity?.toString() ?? ""} placeholder="e.g. 50" />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField id="timeSlotDuration" name="timeSlotDuration" label="Slot Duration (minutes)" type="number" slotProps={{ htmlInput: { min: 15, step: 15 } }} defaultValue={initialData?.timeSlotDuration?.toString() ?? "60"} placeholder="60" />
          <TextField id="maxPerDay" name="maxPerDay" label="Max Bookings Per Day" type="number" slotProps={{ htmlInput: { min: 1 } }} defaultValue={initialData?.maxPerDay?.toString() ?? "3"} placeholder="3" />
        </Box>

        <FormControlLabel
          control={<Switch name="requiresApproval" defaultChecked={initialData?.requiresApproval ?? true} sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: color.brand[600] }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: color.brand[600] } }} />}
          label={<Box>
            <Box sx={{ fontSize: 14, fontWeight: 600 }}>Requires Approval</Box>
            <Box sx={{ fontSize: 12, color: "text.secondary" }}>If checked, student bookings need admin approval.</Box>
          </Box>}
          sx={{ alignItems: "flex-start", gap: 1, mx: 0 }}
        />

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={onClose ?? (() => router.back())} disabled={loading} variant="outlined">
            Cancel
          </Button>
          <KButton type="submit" loading={loading || uploading} icon={isEditing ? "save" : "add"}>
            {loading ? "Saving…" : isEditing ? "Save Changes" : "Add Facility"}
          </KButton>
        </Box>
      </Box>
    </form>
  )
}

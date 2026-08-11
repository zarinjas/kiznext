"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFacility, updateFacility, type FacilityFormData } from "./actions"
import { Image, Plus, Trash2, Upload, X } from "lucide-react"

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
}

export function FacilityForm({ role, blocks, initialData }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    initialData?.featuredImage ?? null
  )
  const [gallery, setGallery] = useState<string[]>(initialData?.gallery ?? [])
  const isEditing = !!initialData

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
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
      price: form.get("price")
        ? parseFloat(form.get("price") as string)
        : null,
      capacity: form.get("capacity")
        ? parseInt(form.get("capacity") as string, 10)
        : null,
      timeSlotDuration: form.get("timeSlotDuration")
        ? parseInt(form.get("timeSlotDuration") as string, 10)
        : null,
      maxPerDay: form.get("maxPerDay")
        ? parseInt(form.get("maxPerDay") as string, 10)
        : 3,
      requiresApproval: form.get("requiresApproval") === "on",
    }

    try {
      if (isEditing) {
        await updateFacility(initialData.id, data)
      } else {
        await createFacility(data)
      }
      router.refresh()
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Facility Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Facility Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initialData?.name}
          placeholder="e.g. Multipurpose Hall"
        />
      </div>

      {/* Block */}
      <div className="space-y-2">
        <Label htmlFor="blockId">Block / Location</Label>
        <select
          id="blockId"
          name="blockId"
          required
          defaultValue={initialData?.blockId ?? ""}
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Select block...
          </option>
          {blocks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          required
          defaultValue={initialData?.description}
          placeholder="Describe this facility..."
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Featured Image */}
      <div className="space-y-2">
        <Label>Featured Image</Label>
        <div className="flex items-start gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary-foreground">
            <Upload className="mb-1 size-5" />
            {uploading ? "Uploading..." : "Choose Image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFeaturedImage}
            />
          </label>
          {featuredImage && (
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredImage}
                alt="Featured"
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFeaturedImage(null)}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-2">
        <Label>Image Gallery</Label>
        <div className="flex flex-wrap gap-2">
          {gallery.map((url, i) => (
            <div key={i} className="relative size-20 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Gallery ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary-foreground">
            <Plus className="mb-1 size-5" />
            Add
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryUpload}
            />
          </label>
        </div>
      </div>

      {/* Price & Capacity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (RM) — Leave empty if free</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initialData?.price?.toString() ?? ""}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (people)</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            defaultValue={initialData?.capacity?.toString() ?? ""}
            placeholder="e.g. 50"
          />
        </div>
      </div>

      {/* Tempoh slot & Maks sehari */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="timeSlotDuration">Slot Duration (minutes)</Label>
          <Input
            id="timeSlotDuration"
            name="timeSlotDuration"
            type="number"
            min="15"
            step="15"
            defaultValue={initialData?.timeSlotDuration?.toString() ?? "60"}
            placeholder="60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPerDay">Max Bookings Per Day</Label>
          <Input
            id="maxPerDay"
            name="maxPerDay"
            type="number"
            min="1"
            defaultValue={initialData?.maxPerDay?.toString() ?? "3"}
            placeholder="3"
          />
        </div>
      </div>

      {/* Requires Approval */}
      <label className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <input
          type="checkbox"
          name="requiresApproval"
          defaultChecked={initialData?.requiresApproval ?? true}
          className="size-4 accent-[#91C953]"
        />
        <div className="text-sm">
          <span className="font-medium text-primary-foreground">
            Requires Approval
          </span>
          <p className="text-muted-foreground">
            If checked, student bookings need admin approval.
          </p>
        </div>
      </label>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading
            ? "Saving..."
            : isEditing
              ? "Save Changes"
              : "Add Facility"}
        </Button>
      </div>
    </form>
  )
}

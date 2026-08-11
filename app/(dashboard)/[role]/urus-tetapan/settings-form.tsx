"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadAppLogo, removeAppLogo } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Upload, Trash2 } from "lucide-react"

interface Props {
  currentLogoUrl: string | null
}

export function SettingsForm({ currentLogoUrl }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const file = formData.get("logo") as File
    if (!file || file.size === 0) {
      setError("Please select a file")
      return
    }

    setUploading(true)
    const result = await uploadAppLogo(formData)
    setUploading(false)

    if (result.success) {
      setPreview(result.url ?? null)
      setSuccess("Logo updated!")
      router.refresh()
    } else {
      setError(result.error ?? "Upload failed")
    }
  }

  async function handleRemove() {
    setError("")
    setSuccess("")
    setRemoving(true)

    const result = await removeAppLogo()
    setRemoving(false)

    if (result.success) {
      setPreview(null)
      setSuccess("Logo removed")
      router.refresh()
    } else {
      setError(result.error ?? "Remove failed")
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">App Logo</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload your app logo. PNG, JPEG, WebP, or SVG. Max 2MB. Shows on login page, sidebar, and mobile header.
      </p>

      <div className="mt-4">
        {preview ? (
          <div className="mb-4 flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-xl border border-border bg-white p-3">
              <img
                src={preview}
                alt="Logo preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Current logo</p>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
              >
                <Trash2 className="size-3" />
                {removing ? "Removing..." : "Remove logo"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex size-20 items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            No logo
          </div>
        )}

        <form onSubmit={handleUpload} className="flex items-end gap-3">
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground"
            />
          </div>
          <Button type="submit" disabled={uploading} size="sm">
            <Upload className="size-3.5 mr-1.5" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        {success && <p className="mt-3 text-xs text-green-600">{success}</p>}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import { uploadAppLogo, removeAppLogo, uploadLoginBackground, removeLoginBackground } from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  currentLogoUrl: string | null
  currentLoginBackgroundUrl: string | null
}

export function SettingsForm({ currentLogoUrl, currentLoginBackgroundUrl }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(currentLoginBackgroundUrl)
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const [backgroundRemoving, setBackgroundRemoving] = useState(false)
  const [backgroundError, setBackgroundError] = useState("")
  const [backgroundSuccess, setBackgroundSuccess] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const file = formData.get("logo") as File
    if (!file || file.size === 0) {
      setError("Pick a file first — we can't upload thin air.")
      return
    }

    setUploading(true)
    let result
    try {
      result = await uploadAppLogo(formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setUploading(false)
    }

    if (result.success) {
      setPreview(result.url ?? null)
      setSuccess("New look, who dis? Logo updated! ✨")
      router.refresh()
    } else {
      setError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleRemove() {
    setError("")
    setSuccess("")
    setRemoving(true)

    let result
    try {
      result = await removeAppLogo()
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't remove it — try again." }
    } finally {
      setRemoving(false)
    }

    if (result.success) {
      setPreview(null)
      setSuccess("Logo's gone — back to the default look.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  async function handleBackgroundUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBackgroundError("")
    setBackgroundSuccess("")
    const formData = new FormData(e.currentTarget)
    const file = formData.get("background") as File
    if (!file || file.size === 0) {
      setBackgroundError("Pick a photo first.")
      return
    }

    setBackgroundUploading(true)
    let result
    try {
      result = await uploadLoginBackground(formData)
    } catch {
      result = { success: false, error: "Upload didn't go through — give it another shot." }
    } finally {
      setBackgroundUploading(false)
    }

    if (result.success) {
      setBackgroundPreview(result.url ?? null)
      setBackgroundSuccess("College photo updated. It is now live on the login page.")
      router.refresh()
    } else {
      setBackgroundError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleBackgroundRemove() {
    setBackgroundError("")
    setBackgroundSuccess("")
    setBackgroundRemoving(true)
    let result
    try {
      result = await removeLoginBackground()
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setBackgroundRemoving(false)
    }

    if (result.success) {
      setBackgroundPreview(null)
      setBackgroundSuccess("College photo removed. The default gradient is back.")
      router.refresh()
    } else {
      setBackgroundError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  return (
    <>
    <FormSection title="App Logo" subtitle="PNG, JPEG, WebP, or SVG. Max 2MB. Shows on the login page and sidebar." icon="image">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        {preview ? (
          <Box sx={{ width: 80, height: 80, borderRadius: 2, border: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", p: 1 }}>
            <Box component="img" src={preview} alt="Logo preview" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </Box>
        ) : (
          <Box sx={{ width: 80, height: 80, borderRadius: 2, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 12 }}>
            No logo
          </Box>
        )}
        {preview && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Current logo</Typography>
            <Button
              size="small"
              onClick={handleRemove}
              disabled={removing}
              startIcon={<KIcon icon="delete" size={15} />}
              sx={{ color: "error.main", mt: 0.5 }}
            >
              {removing ? "Removing…" : "Remove logo"}
            </Button>
          </Box>
        )}
      </Box>

      <form onSubmit={handleUpload} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />}>
          Choose file
          <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPreview(URL.createObjectURL(file))
          }} />
        </Button>
        <Button type="submit" variant="contained" disabled={uploading} startIcon={uploading ? undefined : <KIcon icon="save" size={16} />}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
    </FormSection>
    <FormSection title="Login Background" subtitle="Optional college photo for the desktop login panel. A soft gradient overlay keeps the text clear. PNG, JPEG, or WebP. Max 12MB." icon="landscape">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        {backgroundPreview ? (
          <Box component="img" src={backgroundPreview} alt="Login background preview" sx={{ width: 112, height: 72, borderRadius: 2, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
        ) : (
          <Box sx={{ width: 112, height: 72, borderRadius: 2, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 12 }}>
            Default gradient
          </Box>
        )}
        {backgroundPreview && (
          <Button size="small" onClick={handleBackgroundRemove} disabled={backgroundRemoving} startIcon={<KIcon icon="delete" size={15} />} sx={{ color: "error.main" }}>
            {backgroundRemoving ? "Removing…" : "Remove photo"}
          </Button>
        )}
      </Box>
      <form onSubmit={handleBackgroundUpload} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />}>
          Choose photo
          <input type="file" name="background" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setBackgroundPreview(URL.createObjectURL(file))
          }} />
        </Button>
        <Button type="submit" variant="contained" disabled={backgroundUploading} startIcon={backgroundUploading ? undefined : <KIcon icon="save" size={16} />}>
          {backgroundUploading ? "Uploading…" : "Upload photo"}
        </Button>
      </form>
      {backgroundError && <Alert severity="error" sx={{ mt: 2 }}>{backgroundError}</Alert>}
      {backgroundSuccess && <Alert severity="success" sx={{ mt: 2 }}>{backgroundSuccess}</Alert>}
    </FormSection>
    </>
  )
}

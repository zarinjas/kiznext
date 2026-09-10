"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import { uploadAppLogo, removeAppLogo, uploadLoginBackground, removeLoginBackground, uploadDashboardHeroBackground, removeDashboardHeroBackground, uploadDashboardPoster, removeDashboardPoster } from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  currentLogoUrl: string | null
  currentLoginBackgroundUrl: string | null
  currentDashboardHeroBackgroundUrl: string | null
  currentDashboardPosterUrl: string | null
}

export function SettingsForm({ currentLogoUrl, currentLoginBackgroundUrl, currentDashboardHeroBackgroundUrl, currentDashboardPosterUrl }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(currentLoginBackgroundUrl)
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const [backgroundRemoving, setBackgroundRemoving] = useState(false)
  const [backgroundError, setBackgroundError] = useState("")
  const [backgroundSuccess, setBackgroundSuccess] = useState("")
  const [heroPreview, setHeroPreview] = useState<string | null>(currentDashboardHeroBackgroundUrl)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroRemoving, setHeroRemoving] = useState(false)
  const [heroError, setHeroError] = useState("")
  const [heroSuccess, setHeroSuccess] = useState("")
  const [posterPreview, setPosterPreview] = useState<string | null>(currentDashboardPosterUrl)
  const [posterUploading, setPosterUploading] = useState(false)
  const [posterRemoving, setPosterRemoving] = useState(false)
  const [posterError, setPosterError] = useState("")
  const [posterSuccess, setPosterSuccess] = useState("")
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
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
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

  async function handleHeroUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHeroError("")
    setHeroSuccess("")
    const formData = new FormData(e.currentTarget)
    const file = formData.get("background") as File
    if (!file || file.size === 0) {
      setHeroError("Pick a photo first.")
      return
    }

    setHeroUploading(true)
    let result
    try {
      result = await uploadDashboardHeroBackground(formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setHeroUploading(false)
    }

    if (result.success) {
      setHeroPreview(result.url ?? null)
      setHeroSuccess("Dashboard banner updated — it's now live on member dashboards.")
      router.refresh()
    } else {
      setHeroError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleHeroRemove() {
    setHeroError("")
    setHeroSuccess("")
    setHeroRemoving(true)
    let result
    try {
      result = await removeDashboardHeroBackground()
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setHeroRemoving(false)
    }

    if (result.success) {
      setHeroPreview(null)
      setHeroSuccess("Dashboard banner removed. The default gradient is back.")
      router.refresh()
    } else {
      setHeroError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  async function handlePosterUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPosterError("")
    setPosterSuccess("")
    const formData = new FormData(e.currentTarget)
    const file = formData.get("poster") as File
    if (!file || file.size === 0) {
      setPosterError("Pick an image first.")
      return
    }

    setPosterUploading(true)
    let result
    try {
      result = await uploadDashboardPoster(formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setPosterUploading(false)
    }

    if (result.success) {
      setPosterPreview(result.url ?? null)
      setPosterSuccess("Poster live on the dashboard — nice and visible.")
      router.refresh()
    } else {
      setPosterError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handlePosterRemove() {
    setPosterError("")
    setPosterSuccess("")
    setPosterRemoving(true)
    let result
    try {
      result = await removeDashboardPoster()
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setPosterRemoving(false)
    }

    if (result.success) {
      setPosterPreview(null)
      setPosterSuccess("Poster removed. The dashboard slot hides itself.")
      router.refresh()
    } else {
      setPosterError(result.error ?? "Couldn't remove it — try again.")
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
    <FormSection title="Dashboard Banner" subtitle="Full-width background image behind the member dashboard hero card. Designed as a wide banner (approx. 1600 × 400). Falls back to the default gradient when empty. PNG, JPEG, or WebP. Max 12MB." icon="dashboard">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        {heroPreview ? (
          <Box component="img" src={heroPreview} alt="Dashboard banner preview" sx={{ width: 160, height: 40, borderRadius: 2, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
        ) : (
          <Box sx={{ width: 160, height: 40, borderRadius: 2, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 12 }}>
            Default gradient
          </Box>
        )}
        {heroPreview && (
          <Button size="small" onClick={handleHeroRemove} disabled={heroRemoving} startIcon={<KIcon icon="delete" size={15} />} sx={{ color: "error.main" }}>
            {heroRemoving ? "Removing…" : "Remove banner"}
          </Button>
        )}
      </Box>
      <form onSubmit={handleHeroUpload} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />}>
          Choose image
          <input type="file" name="background" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setHeroPreview(URL.createObjectURL(file))
          }} />
        </Button>
        <Button type="submit" variant="contained" disabled={heroUploading} startIcon={heroUploading ? undefined : <KIcon icon="save" size={16} />}>
          {heroUploading ? "Uploading…" : "Upload banner"}
        </Button>
      </form>
      {heroError && <Alert severity="error" sx={{ mt: 2 }}>{heroError}</Alert>}
      {heroSuccess && <Alert severity="success" sx={{ mt: 2 }}>{heroSuccess}</Alert>}
    </FormSection>
    <FormSection title="Dashboard Poster" subtitle="Optional portrait poster beside the Things-to-do card (e.g. an Instagram post). Best at 1080 × 1350 (4:5 portrait). Hidden when empty. PNG, JPEG, or WebP. Max 12MB." icon="photo">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        {posterPreview ? (
          <Box component="img" src={posterPreview} alt="Dashboard poster preview" sx={{ width: 80, height: 100, borderRadius: 2, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
        ) : (
          <Box sx={{ width: 80, height: 100, borderRadius: 2, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 12 }}>
            Empty
          </Box>
        )}
        {posterPreview && (
          <Button size="small" onClick={handlePosterRemove} disabled={posterRemoving} startIcon={<KIcon icon="delete" size={15} />} sx={{ color: "error.main" }}>
            {posterRemoving ? "Removing…" : "Remove poster"}
          </Button>
        )}
      </Box>
      <form onSubmit={handlePosterUpload} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Button component="label" variant="outlined" startIcon={<KIcon icon="upload" size={16} />}>
          Choose image
          <input type="file" name="poster" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPosterPreview(URL.createObjectURL(file))
          }} />
        </Button>
        <Button type="submit" variant="contained" disabled={posterUploading} startIcon={posterUploading ? undefined : <KIcon icon="save" size={16} />}>
          {posterUploading ? "Uploading…" : "Upload poster"}
        </Button>
      </form>
      {posterError && <Alert severity="error" sx={{ mt: 2 }}>{posterError}</Alert>}
      {posterSuccess && <Alert severity="success" sx={{ mt: 2 }}>{posterSuccess}</Alert>}
    </FormSection>
    </>
  )
}

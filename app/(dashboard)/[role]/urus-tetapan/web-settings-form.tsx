"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import {
  uploadLoginBackground,
  removeLoginBackground,
  uploadDashboardHeroBackground,
  removeDashboardHeroBackground,
  uploadDashboardPoster,
  removeDashboardPoster,
} from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  currentLoginBackgroundUrl: string | null
  currentDashboardHeroBackgroundUrl: string | null
  currentDashboardPosterUrl: string | null
}

/** Website appearance — login panel, member dashboard banner and poster. */
export function WebSettingsForm({
  currentLoginBackgroundUrl,
  currentDashboardHeroBackgroundUrl,
  currentDashboardPosterUrl,
}: Props) {
  const router = useRouter()
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
      result = await uploadDashboardHeroBackground("web", formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setHeroUploading(false)
    }

    if (result.success) {
      setHeroPreview(result.url ?? null)
      setHeroSuccess("Website banner updated — it's now live on member dashboards.")
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
      result = await removeDashboardHeroBackground("web")
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setHeroRemoving(false)
    }

    if (result.success) {
      setHeroPreview(null)
      setHeroSuccess("Website banner removed. The default gradient is back.")
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

      <FormSection title="Dashboard Banner (Website)" subtitle="Full-width background image behind the member dashboard hero on the desktop site. Designed as a wide banner (approx. 1600 × 400). Falls back to the default gradient when empty. PNG, JPEG, or WebP. Max 12MB." icon="dashboard">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          {heroPreview ? (
            <Box component="img" src={heroPreview} alt="Website banner preview" sx={{ width: 160, height: 40, borderRadius: 2, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
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

      <FormSection title="Dashboard Poster" subtitle="Optional portrait poster beside the Things-to-do card on the desktop dashboard (e.g. an Instagram post). Best at 1080 × 1350 (4:5 portrait). Hidden when empty. PNG, JPEG, or WebP. Max 12MB." icon="photo">
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

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import {
  uploadDashboardHeroBackground,
  removeDashboardHeroBackground,
  setDashboardHeroOverlay,
  uploadShowcaseBackground,
  removeShowcaseBackground,
} from "@/lib/settings"
import type { HeroOverlay, ShowcaseBackgrounds, ShowcaseSlot } from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  currentDashboardHeroBackgroundUrl: string | null
  currentDashboardHeroOverlay: HeroOverlay
  currentShowcaseBackgrounds: ShowcaseBackgrounds
}

/** Mobile app appearance — hero banner + text overlay + AI/AR showcase cards. */
export function AppSettingsForm({
  currentDashboardHeroBackgroundUrl,
  currentDashboardHeroOverlay,
  currentShowcaseBackgrounds,
}: Props) {
  const router = useRouter()
  const [heroPreview, setHeroPreview] = useState<string | null>(currentDashboardHeroBackgroundUrl)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroRemoving, setHeroRemoving] = useState(false)
  const [heroError, setHeroError] = useState("")
  const [heroSuccess, setHeroSuccess] = useState("")

  // Hero overlay gradient — two stops + opacity, applied over the banner image.
  const [overlay, setOverlay] = useState<HeroOverlay>(currentDashboardHeroOverlay)
  const [overlaySaving, setOverlaySaving] = useState(false)
  const [overlayError, setOverlayError] = useState("")
  const [overlaySuccess, setOverlaySuccess] = useState("")

  // AI & AR showcase card backgrounds (image overrides the default gradient).
  const [showcase, setShowcase] = useState<ShowcaseBackgrounds>(currentShowcaseBackgrounds)
  const [showcaseBusy, setShowcaseBusy] = useState<ShowcaseSlot | null>(null)
  const [showcaseError, setShowcaseError] = useState("")
  const [showcaseSuccess, setShowcaseSuccess] = useState("")

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
      result = await uploadDashboardHeroBackground("app", formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setHeroUploading(false)
    }

    if (result.success) {
      setHeroPreview(result.url ?? null)
      setHeroSuccess("App banner updated — it's now live on the mobile dashboard.")
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
      result = await removeDashboardHeroBackground("app")
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setHeroRemoving(false)
    }

    if (result.success) {
      setHeroPreview(null)
      setHeroSuccess("App banner removed. The default gradient is back.")
      router.refresh()
    } else {
      setHeroError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  async function handleOverlaySave() {
    setOverlayError("")
    setOverlaySuccess("")
    setOverlaySaving(true)
    let result
    try {
      result = await setDashboardHeroOverlay(overlay)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't save the overlay." }
    } finally {
      setOverlaySaving(false)
    }

    if (result.success) {
      setOverlaySuccess("Overlay updated — it's now live on the app hero.")
      router.refresh()
    } else {
      setOverlayError(result.error ?? "Couldn't save the overlay.")
    }
  }

  async function handleShowcaseUpload(slot: ShowcaseSlot, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setShowcaseError("")
    setShowcaseSuccess("")
    const formData = new FormData(e.currentTarget)
    const file = formData.get("background") as File
    if (!file || file.size === 0) {
      setShowcaseError("Pick an image first.")
      return
    }

    setShowcaseBusy(slot)
    let result
    try {
      result = await uploadShowcaseBackground(slot, formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setShowcaseBusy(null)
    }

    if (result.success) {
      setShowcase((prev) => ({ ...prev, [slot]: result.url ?? null }))
      setShowcaseSuccess(`${slot === "lens" ? "KIZ Lens" : "AR Wayfinder"} card updated.`)
      router.refresh()
    } else {
      setShowcaseError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleShowcaseRemove(slot: ShowcaseSlot) {
    setShowcaseError("")
    setShowcaseSuccess("")
    setShowcaseBusy(slot)
    let result
    try {
      result = await removeShowcaseBackground(slot)
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setShowcaseBusy(null)
    }

    if (result.success) {
      setShowcase((prev) => ({ ...prev, [slot]: null }))
      setShowcaseSuccess("Card background removed — the default gradient is back.")
      router.refresh()
    } else {
      setShowcaseError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  return (
    <>
      <FormSection title="Dashboard Banner (App)" subtitle="Background image behind the hero card on the mobile app dashboard. Portrait-friendly (approx. 1200 × 800) — separate from the website banner so neither gets cropped. Falls back to the default gradient when empty. PNG, JPEG, or WebP. Max 12MB." icon="smartphone">
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          {heroPreview ? (
            <Box component="img" src={heroPreview} alt="App banner preview" sx={{ width: 96, height: 64, borderRadius: 2, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
          ) : (
            <Box sx={{ width: 96, height: 64, borderRadius: 2, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 12 }}>
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

        <Box sx={{ mt: 2, borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Text overlay</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            A gradient drawn over the banner so the greeting stays readable on any photo. Applies to the mobile app hero.
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input
                type="color"
                value={overlay.from}
                onChange={(e) => setOverlay((p) => ({ ...p, from: e.target.value }))}
                style={{ width: 34, height: 34, border: "1px solid #e5e7eb", borderRadius: 8, padding: 0, background: "none", cursor: "pointer" }}
                aria-label="Overlay start colour"
              />
              <Typography variant="caption">{overlay.from}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">→</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <input
                type="color"
                value={overlay.to}
                onChange={(e) => setOverlay((p) => ({ ...p, to: e.target.value }))}
                style={{ width: 34, height: 34, border: "1px solid #e5e7eb", borderRadius: 8, padding: 0, background: "none", cursor: "pointer" }}
                aria-label="Overlay end colour"
              />
              <Typography variant="caption">{overlay.to}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 1 }}>
              <Typography variant="caption" color="text.secondary">Opacity</Typography>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(overlay.opacity * 100)}
                onChange={(e) => setOverlay((p) => ({ ...p, opacity: Number(e.target.value) / 100 }))}
                style={{ width: 120 }}
                aria-label="Overlay opacity"
              />
              <Typography variant="caption" sx={{ minWidth: 34 }}>{Math.round(overlay.opacity * 100)}%</Typography>
            </Box>
            <Button size="small" variant="contained" onClick={handleOverlaySave} disabled={overlaySaving} startIcon={overlaySaving ? undefined : <KIcon icon="save" size={15} />}>
              {overlaySaving ? "Saving…" : "Save overlay"}
            </Button>
          </Box>
          {overlayError && <Alert severity="error" sx={{ mt: 1.5 }}>{overlayError}</Alert>}
          {overlaySuccess && <Alert severity="success" sx={{ mt: 1.5 }}>{overlaySuccess}</Alert>}
        </Box>
      </FormSection>

      <FormSection title="AI & AR Showcase" subtitle="Background images for the two promoted cards on the mobile dashboard. Landscape, approx. 800 × 500. Falls back to the built-in gradient when empty. PNG, JPEG, or WebP. Max 8MB." icon="view_in_ar">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {([
            { slot: "lens" as ShowcaseSlot, label: "KIZ Lens", hint: "Point at any sign — read it in your language" },
            { slot: "wayfinder" as ShowcaseSlot, label: "AR Wayfinder", hint: "Follow a live arrow to any block" },
          ]).map((card) => {
            const url = showcase[card.slot]
            return (
              <Box key={card.slot} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {url ? (
                    <Box component="img" src={url} alt={`${card.label} background`} sx={{ width: 96, height: 60, borderRadius: 1.5, border: "1px solid", borderColor: "divider", objectFit: "cover" }} />
                  ) : (
                    <Box sx={{ width: 96, height: 60, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 11 }}>
                      Gradient
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{card.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{card.hint}</Typography>
                  </Box>
                  {url && (
                    <Button size="small" onClick={() => handleShowcaseRemove(card.slot)} disabled={showcaseBusy === card.slot} startIcon={<KIcon icon="delete" size={15} />} sx={{ color: "error.main" }}>
                      {showcaseBusy === card.slot ? "Removing…" : "Remove"}
                    </Button>
                  )}
                </Box>
                <form onSubmit={(e) => handleShowcaseUpload(card.slot, e)} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <Button component="label" variant="outlined" size="small" startIcon={<KIcon icon="upload" size={15} />}>
                    Choose image
                    <input type="file" name="background" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) setShowcase((prev) => ({ ...prev, [card.slot]: URL.createObjectURL(file) }))
                    }} />
                  </Button>
                  <Button type="submit" variant="contained" size="small" disabled={showcaseBusy === card.slot} startIcon={showcaseBusy === card.slot ? undefined : <KIcon icon="save" size={15} />}>
                    {showcaseBusy === card.slot ? "Uploading…" : "Upload"}
                  </Button>
                </form>
              </Box>
            )
          })}
        </Box>
        {showcaseError && <Alert severity="error" sx={{ mt: 2 }}>{showcaseError}</Alert>}
        {showcaseSuccess && <Alert severity="success" sx={{ mt: 2 }}>{showcaseSuccess}</Alert>}
      </FormSection>
    </>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import Switch from "@mui/material/Switch"
import {
  uploadStudentCardBackground,
  removeStudentCardBackground,
  setStudentCardColor,
  setStudentCardColorEnd,
} from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StudentCardFace } from "@/components/shared/student-card-face"

interface Props {
  currentBackgroundUrl: string | null
  currentColor: string
  currentColorEnd: string | null
  logoUrl: string | null
}

const PREVIEW_NAME = "Ahmad Firdaus Bin Zainal"

export function StudentCardDesignForm({ currentBackgroundUrl, currentColor, currentColorEnd, logoUrl }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentBackgroundUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [colorStart, setColorStart] = useState(currentColor)
  const [gradientEnabled, setGradientEnabled] = useState(Boolean(currentColorEnd))
  const [colorEnd, setColorEnd] = useState(currentColorEnd ?? "#164E63")
  const [savingColor, setSavingColor] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const file = formData.get("background") as File
    if (!file || file.size === 0) {
      setError("Pick a file first — we can't upload thin air.")
      return
    }

    setUploading(true)
    let result
    try {
      result = await uploadStudentCardBackground(formData)
    } catch {
      result = { success: false, error: "Upload didn't go through — give it another shot." }
    } finally {
      setUploading(false)
    }

    if (result.success) {
      setPreview(result.url ?? null)
      setSuccess("Card background updated ✨")
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
      result = await removeStudentCardBackground()
    } catch {
      result = { success: false, error: "Couldn't remove it — try again." }
    } finally {
      setRemoving(false)
    }

    if (result.success) {
      setPreview(null)
      setSuccess("Background removed.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  async function handleStartChange(next: string) {
    setColorStart(next)
    setSavingColor(true)
    setError("")
    let result
    try {
      result = await setStudentCardColor(next)
    } catch {
      result = { success: false, error: "Couldn't save the colour." }
    } finally {
      setSavingColor(false)
    }
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save the colour.")
    }
  }

  async function handleEndChange(next: string) {
    setColorEnd(next)
    if (!gradientEnabled) return
    setSavingColor(true)
    setError("")
    let result
    try {
      result = await setStudentCardColorEnd(next)
    } catch {
      result = { success: false, error: "Couldn't save the colour." }
    } finally {
      setSavingColor(false)
    }
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save the colour.")
    }
  }

  async function handleGradientToggle(enabled: boolean) {
    setGradientEnabled(enabled)
    setSavingColor(true)
    setError("")
    let result
    try {
      result = await setStudentCardColorEnd(enabled ? colorEnd : null)
    } catch {
      result = { success: false, error: "Couldn't save the colour." }
    } finally {
      setSavingColor(false)
    }
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save the colour.")
    }
  }

  const nameBarBackground = gradientEnabled
    ? `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)`
    : colorStart

  return (
    <FormSection
      title="Student Card Design"
      subtitle="Background image and name-bar colour for the Student Digital KIZ Card."
      icon="badge"
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Background upload */}
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Card background
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Recommended background size: 639px × 1125px (portrait). PNG or JPG, max 4MB.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            {preview ? (
              <Box sx={{ width: 64, height: 112, borderRadius: 1.5, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                <Box component="img" src={preview} alt="Background preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
            ) : (
              <Box sx={{ width: 64, height: 112, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 11 }}>
                No bg
              </Box>
            )}
            {preview && (
              <Button
                size="small"
                onClick={handleRemove}
                disabled={removing}
                startIcon={<KIcon icon="delete" size={15} />}
                sx={{ color: "error.main" }}
              >
                {removing ? "Removing…" : "Remove"}
              </Button>
            )}
          </Box>

          <form onSubmit={handleUpload} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button component="label" variant="outlined" size="small" startIcon={<KIcon icon="upload" size={16} />}>
              Choose file
              <input
                type="file"
                name="background"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPreview(URL.createObjectURL(file))
                }}
              />
            </Button>
            <Button type="submit" variant="contained" size="small" disabled={uploading} startIcon={uploading ? undefined : <KIcon icon="save" size={16} />}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </form>

          {/* Name bar colour */}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Name bar colour
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Applies to all Student Digital Cards. Optionally blend two colours into a gradient.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Box
              component="input"
              type="color"
              value={colorStart}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartChange(e.target.value)}
              sx={{ width: 44, height: 36, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, cursor: "pointer", backgroundColor: "transparent" }}
            />
            <Typography variant="body2" sx={{ fontFamily: "var(--font-mono), monospace", color: "text.secondary" }}>
              {colorStart.toUpperCase()}
            </Typography>
            {savingColor && (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Saving…
              </Typography>
            )}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: gradientEnabled ? 1.5 : 0 }}>
            <Switch
              size="small"
              checked={gradientEnabled}
              onChange={(e) => handleGradientToggle(e.target.checked)}
            />
            <Typography variant="body2">Use gradient</Typography>
          </Box>

          {gradientEnabled && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                component="input"
                type="color"
                value={colorEnd}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEndChange(e.target.value)}
                sx={{ width: 44, height: 36, p: 0, border: "1px solid", borderColor: "divider", borderRadius: 1, cursor: "pointer", backgroundColor: "transparent" }}
              />
              <Typography variant="body2" sx={{ fontFamily: "var(--font-mono), monospace", color: "text.secondary" }}>
                {colorEnd.toUpperCase()}
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        </Box>

        {/* Live preview */}
        <Box sx={{ width: { xs: "100%", sm: 180 }, flexShrink: 0 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1, textAlign: "center" }}>
            Live preview
          </Typography>
          <StudentCardFace
            name={PREVIEW_NAME}
            block="A-12"
            roomNumber="03"
            avatarUrl={null}
            backgroundUrl={preview}
            nameBarBackground={nameBarBackground}
            logoUrl={logoUrl}
          />
        </Box>
      </Box>
    </FormSection>
  )
}

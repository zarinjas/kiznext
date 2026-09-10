"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import TextField from "@mui/material/TextField"
import {
  uploadStudentCardBackground,
  removeStudentCardBackground,
  uploadStudentCardLogo,
  removeStudentCardLogo,
  setResidentialSession,
} from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StudentCardFace } from "@/components/shared/student-card-face"

interface Props {
  currentBackgroundUrl: string | null
  ukmLogoUrl: string | null
  kizLogoUrl: string | null
  /** Current Residential Session shown on the card, e.g. "2026/2027". */
  session: string | null
}

const PREVIEW_NAME = "Ahmad Firdaus Bin Zainal"
const PREVIEW_MATRIC = "A123456"

export function StudentCardDesignForm({ currentBackgroundUrl, ukmLogoUrl, kizLogoUrl, session }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentBackgroundUrl)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [ukmLogo, setUkmLogo] = useState<string | null>(ukmLogoUrl)
  const [kizLogo, setKizLogo] = useState<string | null>(kizLogoUrl)
  const [logoUploading, setLogoUploading] = useState<string | null>(null)
  const [logoRemoving, setLogoRemoving] = useState<string | null>(null)
  const [sessionValue, setSessionValue] = useState(session ?? "")
  const [savingSession, setSavingSession] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSessionSave() {
    setError("")
    setSuccess("")
    setSavingSession(true)
    let result
    try {
      result = await setResidentialSession(sessionValue)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't save the session." }
    } finally {
      setSavingSession(false)
    }
    if (result.success) {
      setSuccess("Residential session updated.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save the session.")
    }
  }

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
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
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
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't remove it — try again." }
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

  async function handleLogoUpload(slot: "ukm" | "kiz", file: File) {
    setError("")
    setSuccess("")
    setLogoUploading(slot)

    const formData = new FormData()
    formData.set("logo", file)
    formData.set("slot", slot)

    let result
    try {
      result = await uploadStudentCardLogo(formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setLogoUploading(null)
    }

    if (result.success) {
      if (slot === "ukm") setUkmLogo(result.url ?? null)
      else setKizLogo(result.url ?? null)
      setSuccess(slot === "ukm" ? "UKM logo updated." : "KIZ logo updated.")
      router.refresh()
    } else {
      setError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleLogoRemove(slot: "ukm" | "kiz") {
    setError("")
    setSuccess("")
    setLogoRemoving(slot)

    let result
    try {
      result = await removeStudentCardLogo(slot)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't remove it — try again." }
    } finally {
      setLogoRemoving(null)
    }

    if (result.success) {
      if (slot === "ukm") setUkmLogo(null)
      else setKizLogo(null)
      setSuccess(slot === "ukm" ? "UKM logo removed." : "KIZ logo removed.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't remove it — try again.")
    }
  }

  function logoSlot(slot: "ukm" | "kiz") {
    const value = slot === "ukm" ? ukmLogo : kizLogo
    const uploading = logoUploading === slot
    const removing = logoRemoving === slot
    const busy = uploading || removing
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 56, height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", p: 0.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider", backgroundColor: "#fff", overflow: "hidden" }}>
          {value ? (
            <Box component="img" src={value} alt={`${slot.toUpperCase()} logo`} sx={{ maxWidth: "100%", maxHeight: "100%", width: "auto", objectFit: "contain" }} />
          ) : (
            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600 }}>
              {slot.toUpperCase()}
            </Typography>
          )}
        </Box>
        <Button
          component="label"
          variant="outlined"
          size="small"
          disabled={busy}
          startIcon={<KIcon icon="upload" size={15} />}
        >
          {uploading ? "Saving…" : "Choose"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLogoUpload(slot, file)
            }}
          />
        </Button>
        {value && (
          <Button size="small" onClick={() => handleLogoRemove(slot)} disabled={removing} startIcon={<KIcon icon="delete" size={15} />} sx={{ color: "error.main" }}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        )}
      </Box>
    )
  }

  return (
    <FormSection
      title="Student Card Design"
      subtitle="Background image and logos for the Student Digital KIZ Card."
      icon="badge"
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Background upload */}
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Card background
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Recommended background size: 380px × 550px (portrait). PNG or JPG, max 4MB.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            {preview ? (
              <Box sx={{ width: 64, height: 108, borderRadius: 1.5, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                <Box component="img" src={preview} alt="Background preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </Box>
            ) : (
              <Box sx={{ width: 64, height: 108, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 11 }}>
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

          {/* Logos */}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Card logos
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            UKM crest appears top-left, KIZ logo top-right. PNG, JPEG, WebP, or SVG. Max 2MB.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ width: 64, color: "text.secondary" }}>UKM</Typography>
              {logoSlot("ukm")}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ width: 64, color: "text.secondary" }}>KIZ</Typography>
              {logoSlot("kiz")}
            </Box>
          </Box>

          {/* Residential Session */}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
            Residential Session
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Printed under the room line, e.g. &ldquo;2026/2027&rdquo;. Falls back to the active intake when empty.
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TextField
              value={sessionValue}
              onChange={(e) => setSessionValue(e.target.value)}
              placeholder="2026/2027"
              size="small"
              sx={{ flex: 1, minWidth: 160 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSessionSave()
                }
              }}
            />
            <Button variant="contained" size="small" disabled={savingSession} onClick={handleSessionSave} startIcon={savingSession ? undefined : <KIcon icon="save" size={16} />}>
              {savingSession ? "Saving…" : "Save"}
            </Button>
          </Box>

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
            matricId={PREVIEW_MATRIC}
            blockName="K18A"
            roomNumber="101"
            bed="A"
            session={sessionValue.trim() ? `Session ${sessionValue.trim()}` : null}
            validUntil="30 September 2027"
            avatarUrl={null}
            backgroundUrl={preview}
            ukmLogoUrl={ukmLogo}
            kizLogoUrl={kizLogo}
          />
        </Box>
      </Box>
    </FormSection>
  )
}

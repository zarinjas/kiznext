"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import TextField from "@mui/material/TextField"
import Chip from "@mui/material/Chip"
import {
  uploadCardBackground,
  removeCardBackground,
  uploadStudentCardLogo,
  removeStudentCardLogo,
  setResidentialSession,
  type CardDesignSlot,
} from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StudentCardFace } from "@/components/shared/student-card-face"

interface Props {
  /** Uploaded background per role group — student / fellow / shared staff. */
  backgrounds: Record<CardDesignSlot, string | null>
  ukmLogoUrl: string | null
  kizLogoUrl: string | null
  /** Current Residential Session shown on the card, e.g. "2026/2027". */
  session: string | null
}

const PREVIEW_NAME = "Ahmad Firdaus Bin Zainal"
const PREVIEW_MATRIC = "A123456"

const BACKGROUND_SLOTS: { slot: CardDesignSlot; label: string; hint: string }[] = [
  { slot: "student", label: "Student", hint: "ahli — the official resident student card" },
  { slot: "fellow", label: "Fellow", hint: "fellow — block caretakers" },
  { slot: "staff", label: "Principal / Staff", hint: "pengetua, timbalan pengetua, staf & admins" },
]

const PREVIEW_SLOTS: { slot: CardDesignSlot; label: string }[] = [
  { slot: "student", label: "Student" },
  { slot: "fellow", label: "Fellow" },
  { slot: "staff", label: "Staff" },
]

export function StudentCardDesignForm({ backgrounds, ukmLogoUrl, kizLogoUrl, session }: Props) {
  const router = useRouter()
  const [backgroundsState, setBackgroundsState] = useState<Record<CardDesignSlot, string | null>>(backgrounds)
  const [previewSlot, setPreviewSlot] = useState<CardDesignSlot>("student")
  const [uploading, setUploading] = useState<CardDesignSlot | null>(null)
  const [removing, setRemoving] = useState<CardDesignSlot | null>(null)
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

  async function handleUpload(slot: CardDesignSlot, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const formData = new FormData(e.currentTarget)
    const file = formData.get("background") as File
    if (!file || file.size === 0) {
      setError("Pick a file first — we can't upload thin air.")
      return
    }

    setUploading(slot)
    let result
    try {
      result = await uploadCardBackground(slot, formData)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Upload didn't go through — give it another shot." }
    } finally {
      setUploading(null)
    }

    if (result.success) {
      setBackgroundsState((prev) => ({ ...prev, [slot]: result.url ?? null }))
      setSuccess("Card background updated ✨")
      router.refresh()
    } else {
      setError(result.error ?? "Upload didn't go through — give it another shot.")
    }
  }

  async function handleRemove(slot: CardDesignSlot) {
    setError("")
    setSuccess("")
    setRemoving(slot)

    let result
    try {
      result = await removeCardBackground(slot)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't remove it — try again." }
    } finally {
      setRemoving(null)
    }

    if (result.success) {
      setBackgroundsState((prev) => ({ ...prev, [slot]: null }))
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

  function backgroundSlot(slot: CardDesignSlot) {
    const preview = backgroundsState[slot]
    const isUploading = uploading === slot
    const isRemoving = removing === slot
    return (
      <Box key={slot} sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
        {preview ? (
          <Box sx={{ width: 64, height: 108, borderRadius: 1.5, border: "1px solid", borderColor: "divider", overflow: "hidden", flexShrink: 0 }}>
            <Box component="img" src={preview} alt="Background preview" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
        ) : (
          <Box sx={{ width: 64, height: 108, borderRadius: 1.5, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 11, flexShrink: 0 }}>
            No bg
          </Box>
        )}
        <form onSubmit={(e) => handleUpload(slot, e)} style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button component="label" variant="outlined" size="small" startIcon={<KIcon icon="upload" size={16} />}>
              Choose file
              <input
                type="file"
                name="background"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setBackgroundsState((prev) => ({ ...prev, [slot]: URL.createObjectURL(file) }))
                }}
              />
            </Button>
            <Button type="submit" variant="contained" size="small" disabled={isUploading} startIcon={isUploading ? undefined : <KIcon icon="save" size={16} />}>
              {isUploading ? "Uploading…" : "Upload"}
            </Button>
            {preview && (
              <Button
                size="small"
                onClick={() => handleRemove(slot)}
                disabled={isRemoving}
                startIcon={<KIcon icon="delete" size={15} />}
                sx={{ color: "error.main" }}
              >
                {isRemoving ? "Removing…" : "Remove"}
              </Button>
            )}
          </Box>
        </form>
      </Box>
    )
  }

  return (
    <FormSection
      title="Digital Resident ID Design"
      subtitle="Per-role background images and shared logos for the KIZ Digital Resident ID."
      icon="badge"
    >
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 3 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Background uploads — one per role group */}
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Card backgrounds
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
            Recommended 380px × 550px (portrait). PNG or JPG, max 4MB. Students, fellows and
            staff each use their own background.
          </Typography>

          {BACKGROUND_SLOTS.map(({ slot, label, hint }) => (
            <Box key={slot} sx={{ mb: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                {hint}
              </Typography>
              {backgroundSlot(slot)}
            </Box>
          ))}

          {/* Logos */}
          <Typography variant="body2" sx={{ fontWeight: 600, mt: 1, mb: 1 }}>
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
          <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mb: 1, flexWrap: "wrap" }}>
            {PREVIEW_SLOTS.map(({ slot, label }) => (
              <Chip
                key={slot}
                label={label}
                size="small"
                onClick={() => setPreviewSlot(slot)}
                sx={{
                  height: 22,
                  fontSize: "0.6875rem",
                  backgroundColor: previewSlot === slot ? "primary.main" : "transparent",
                  color: previewSlot === slot ? "#fff" : "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ))}
          </Box>
          <StudentCardFace
            name={PREVIEW_NAME}
            matricId={PREVIEW_MATRIC}
            blockName={previewSlot === "staff" ? null : "K18A"}
            roomNumber={previewSlot === "student" ? "101" : null}
            bed={previewSlot === "student" ? "A" : null}
            session={previewSlot === "student" && sessionValue.trim() ? `Session ${sessionValue.trim()}` : null}
            validUntil={previewSlot === "student" ? "30 September 2027" : null}
            avatarUrl={null}
            backgroundUrl={backgroundsState[previewSlot]}
            ukmLogoUrl={ukmLogo}
            kizLogoUrl={kizLogo}
            roleLabel={previewSlot === "student" ? null : previewSlot === "fellow" ? "Fellow" : "Staff"}
          />
        </Box>
      </Box>
    </FormSection>
  )
}

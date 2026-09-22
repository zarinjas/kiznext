"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import TextField from "@mui/material/TextField"
import { ONBOARDING_GRADIENTS, gradientCss } from "@/lib/onboarding-meta"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { color, radius } from "@/lib/theme"
import {
  createOnboardingSlide,
  deleteOnboardingSlide,
  moveOnboardingSlide,
  setOnboardingSlideActive,
  updateOnboardingSlide,
  type OnboardingSlideView,
} from "@/lib/onboarding"

function SlidePreview({ slide }: { slide: OnboardingSlideView }) {
  const g = ONBOARDING_GRADIENTS.find((x) => x.key === slide.gradient) ?? ONBOARDING_GRADIENTS[0]
  return (
    <Box
      sx={{
        width: 72,
        height: 72,
        borderRadius: `${radius.input}px`,
        background: gradientCss(g),
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      {slide.imageUrl && (
        <Box
          component="img"
          src={slide.imageUrl}
          alt=""
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
        />
      )}
    </Box>
  )
}

function VisibilityTag({ active }: { active: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        backgroundColor: active ? color.success.soft : color.neutral.soft,
        color: active ? color.success.ink : color.neutral.ink,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: active ? color.success.main : color.neutral.main,
        }}
      />
      {active ? "Shown" : "Hidden"}
    </Box>
  )
}

export function OnboardingAdmin({ slides }: { slides: OnboardingSlideView[] }) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<OnboardingSlideView | null>(null)
  const [deleting, setDeleting] = useState<OnboardingSlideView | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function move(id: string, direction: "up" | "down") {
    setBusyId(id)
    try {
      await moveOnboardingSlide(id, direction)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(slide: OnboardingSlideView) {
    setBusyId(slide.id)
    try {
      await setOnboardingSlideActive(slide.id, !slide.isActive)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      await deleteOnboardingSlide(deleting.id)
      setDeleting(null)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box>
      {slides.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="view_carousel"
            title="No slides yet"
            body="Add your first welcome slide. If there are no active slides the mobile app skips onboarding entirely."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Slide
          </Button>
        </Box>
      ) : (
        <ListGroup
          title={`${slides.length} slide${slides.length === 1 ? "" : "s"}`}
          action={
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add
            </Button>
          }
        >
          {slides.map((slide, index) => (
            <ListRow
              key={slide.id}
              iconNode={<SlidePreview slide={slide} />}
              title={slide.title}
              subtitle={slide.body || "No description"}
              meta={<VisibilityTag active={slide.isActive} />}
              trailing={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Move ${slide.title} up`}
                        disabled={index === 0 || busyId === slide.id}
                        onClick={() => move(slide.id, "up")}
                      >
                        <KIcon icon="arrow_upward" size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        aria-label={`Move ${slide.title} down`}
                        disabled={index === slides.length - 1 || busyId === slide.id}
                        onClick={() => move(slide.id, "down")}
                      >
                        <KIcon icon="arrow_downward" size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={slide.isActive ? "Hide from app" : "Show in app"}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label={slide.isActive ? `Hide ${slide.title}` : `Show ${slide.title}`}
                        disabled={busyId === slide.id}
                        onClick={() => toggleActive(slide)}
                      >
                        <KIcon icon={slide.isActive ? "visibility" : "visibility_off"} size={17} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setEditing(slide)}
                    aria-label={`Edit ${slide.title}`}
                    sx={{ minWidth: 0, px: 1 }}
                  >
                    <KIcon icon="edit" size={15} />
                  </Button>
                  <IconButton
                    size="small"
                    aria-label={`Delete ${slide.title}`}
                    disabled={busyId === slide.id}
                    onClick={() => setDeleting(slide)}
                  >
                    <KIcon icon="delete" size={17} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </ListGroup>
      )}

      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
        Slides appear in order on the mobile app&apos;s first launch. The last slide&apos;s button starts
        the app. Recommended image size 1080 × 1080 px (PNG/JPG).
      </Typography>

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Slide" icon="view_carousel">
        <SlideForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.title}`} icon="edit">
          <SlideForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}

      <KDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this slide?"
        icon="delete"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setDeleting(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={confirmDelete} loading={busyId === deleting?.id}>
              Delete
            </Button>
          </>
        }
      >
        <Typography variant="body2">
          &ldquo;{deleting?.title}&rdquo; will be removed from the onboarding carousel. You can add it
          again later.
        </Typography>
      </KDialog>
    </Box>
  )
}

function SlideForm({ initial, onClose }: { initial?: OnboardingSlideView; onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial?.title ?? "")
  const [body, setBody] = useState(initial?.body ?? "")
  const [buttonLabel, setButtonLabel] = useState(initial?.buttonLabel ?? "")
  const [gradient, setGradient] = useState(initial?.gradient ?? ONBOARDING_GRADIENTS[0].key)
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("dir", "onboarding")
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed")
      setImageUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setError(null)
    if (!title.trim()) return setError("Give this slide a title.")
    setSaving(true)
    try {
      const payload = { title, body, buttonLabel, gradient, imageUrl }
      if (initial) await updateOnboardingSlide(initial.id, payload)
      else await createOnboardingSlide(payload)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the slide.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Welcome to MyKIZ"
        fullWidth
      />
      <TextField
        label="Text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Everything you need as a KIZ resident, in one app."
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Button label (optional)"
        value={buttonLabel}
        onChange={(e) => setButtonLabel(e.target.value)}
        placeholder="Get started"
        fullWidth
      />

      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          Background gradient
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {ONBOARDING_GRADIENTS.map((g) => (
            <Box
              key={g.key}
              role="button"
              aria-label={g.label}
              aria-pressed={gradient === g.key}
              onClick={() => setGradient(g.key)}
              sx={{
                width: 56,
                height: 40,
                borderRadius: `${radius.input}px`,
                background: gradientCss(g),
                cursor: "pointer",
                border: "2px solid",
                borderColor: gradient === g.key ? color.brand[600] : "transparent",
                boxShadow: gradient === g.key ? `0 0 0 2px ${color.brand[100]}` : "none",
              }}
              title={g.label}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
          Image (optional)
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {imageUrl ? (
            <Box
              component="img"
              src={imageUrl}
              alt=""
              sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: `${radius.input}px`, border: "1px solid", borderColor: "divider" }}
            />
          ) : null}
          <Button variant="outlined" component="label" disabled={uploading}>
            {uploading ? "Uploading…" : imageUrl ? "Replace" : "Upload image"}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
              }}
            />
          </Button>
          {imageUrl ? (
            <Button color="inherit" onClick={() => setImageUrl(null)} sx={{ textTransform: "none" }}>
              Remove
            </Button>
          ) : null}
        </Box>
      </Box>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || uploading}>
          {initial ? "Save changes" : "Add slide"}
        </Button>
      </Box>
    </Box>
  )
}

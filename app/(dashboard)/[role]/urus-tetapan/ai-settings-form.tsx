"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import CircularProgress from "@mui/material/CircularProgress"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { EmotionFrames } from "./emotion-frames"
import { color, radius } from "@/lib/theme"
import {
  saveAiConfig,
  uploadConciergeAvatar,
  removeConciergeAvatar,
  reindexKnowledgeAction,
  clearUnanswered,
} from "@/lib/ai/admin-actions"
import type { UnansweredRow } from "@/lib/ai/types"
import type { ConciergeFrames } from "@/lib/ai/config"

interface Props {
  apiKeySet: boolean
  apiKeyFromEnv: boolean
  initialModel: string
  initialEmbedModel: string
  initialName: string
  avatarUrl: string | null
  frames: ConciergeFrames
  knowledgeCount: number
  unanswered: UnansweredRow[]
}

export function AiSettingsForm({
  apiKeySet,
  apiKeyFromEnv,
  initialModel,
  initialEmbedModel,
  initialName,
  avatarUrl,
  frames,
  knowledgeCount,
  unanswered,
}: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState(initialModel)
  const [embedModel, setEmbedModel] = useState(initialEmbedModel)
  const [name, setName] = useState(initialName)
  const [removeKey, setRemoveKey] = useState(false)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)
    try {
      const result = await saveAiConfig({ apiKey, model, embedModel, conciergeName: name, removeKey })
      if (result.success) {
        setSuccess("KIZ-AI settings saved.")
        setApiKey("")
        setRemoveKey(false)
        router.refresh()
      } else {
        setError(result.error ?? "Couldn't save — try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setSuccess("")
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("avatar", file)
      const result = await uploadConciergeAvatar(fd)
      if (result.success) {
        setSuccess("Robot image updated!")
        router.refresh()
      } else {
        setError(result.error ?? "Upload failed.")
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleRemoveAvatar() {
    setError("")
    setSuccess("")
    const result = await removeConciergeAvatar()
    if (result.success) {
      setSuccess("Robot image removed — the default icon is used.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't remove the image.")
    }
  }

  async function handleReindex() {
    setError("")
    setSuccess("")
    setIndexing(true)
    try {
      const result = await reindexKnowledgeAction()
      if (result.success) {
        setSuccess(`Indexed ${result.indexed} · skipped ${result.skipped} · removed ${result.removed}. KIZ-AI is up to date.`)
        router.refresh()
      } else {
        setError(result.error ?? "Re-index failed.")
      }
    } finally {
      setIndexing(false)
    }
  }

  async function handleClearUnanswered() {
    await clearUnanswered()
    router.refresh()
  }

  return (
    <FormSection
      title="KIZ-AI (Gemini)"
      subtitle="Connect Google Gemini and design the KIZ-AI robot. The key is stored on this server only."
      icon="smart_toy"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Robot avatar */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: `${radius.card}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: color.canvasSunk,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <Box component="img" src={avatarUrl} alt="KIZ-AI" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <KIcon icon="smart_toy" size={32} sx={{ color: color.brand[600] }} />
            )}
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Fallback image
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 360 }}>
              Used when no emotion frames are set (PNG/JPG/WebP, up to 2 MB).
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                startIcon={uploading ? <CircularProgress size={14} /> : <KIcon icon="upload" size={15} />}
                sx={{ textTransform: "none" }}
              >
                {uploading ? "Uploading…" : avatarUrl ? "Replace" : "Upload image"}
              </Button>
              {avatarUrl && (
                <Button size="small" onClick={handleRemoveAvatar} sx={{ textTransform: "none", color: color.danger.main }}>
                  Remove
                </Button>
              )}
            </Box>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
          </Box>
        </Box>

        <EmotionFrames frames={frames} onError={setError} />

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TextField
            label="Gemini API key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              if (e.target.value && removeKey) setRemoveKey(false)
            }}
            placeholder={apiKeySet ? "Saved — leave blank to keep it" : "AIza…"}
            autoComplete="off"
            fullWidth
            disabled={removeKey}
            helperText={
              removeKey
                ? "The stored key will be removed when you save."
                : apiKeyFromEnv
                  ? "Using GEMINI_API_KEY from the server .env. Paste a key here to override it."
                  : apiKeySet
                    ? "The key is hidden. Leave blank to keep it, or paste a new key to replace it."
                    : "Paste a Google AI Studio key (aistudio.google.com → Get API key)."
            }
          />

          {apiKeySet && !apiKeyFromEnv && !removeKey && (
            <Box>
              <Button
                size="small"
                onClick={() => {
                  setRemoveKey(true)
                  setApiKey("")
                }}
                startIcon={<KIcon icon="delete" size={15} />}
                sx={{ color: color.danger.main, textTransform: "none" }}
              >
                Remove API key
              </Button>
            </Box>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Chat model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              helperText="e.g. gemini-2.0-flash"
              fullWidth
            />
            <TextField
              label="Embedding model"
              value={embedModel}
              onChange={(e) => setEmbedModel(e.target.value)}
              helperText="e.g. text-embedding-004"
              fullWidth
            />
          </Box>

          <TextField
            label="Robot name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            helperText="Shown in the concierge header, e.g. KIZ-AI."
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? undefined : <KIcon icon="save" size={16} />}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Box>
        </form>

        {/* Knowledge index */}
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Knowledge index
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {knowledgeCount} item{knowledgeCount === 1 ? "" : "s"} indexed. Re-index after adding announcements, facilities or contacts.
              </Typography>
            </Box>
            <KButton type="button" variant="outlined" size="small" icon="refresh" onClick={handleReindex} loading={indexing}>
              {indexing ? "Indexing…" : "Re-index now"}
            </KButton>
          </Box>
        </Box>

        {/* Feedback loop */}
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Questions KIZ-AI couldn&apos;t answer
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Write an announcement or FAQ for these, then re-index — fewer people queue at the counter.
              </Typography>
            </Box>
            {unanswered.length > 0 && (
              <Button size="small" onClick={handleClearUnanswered} sx={{ textTransform: "none", color: "text.secondary" }}>
                Clear
              </Button>
            )}
          </Box>
          {unanswered.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.disabled" }}>
              Nothing yet — KIZ-AI is handling every question. 🎉
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, maxHeight: 240, overflowY: "auto" }}>
              {unanswered.map((u) => (
                <Box
                  key={u.question}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.25,
                    py: 0.875,
                    borderRadius: `${radius.input}px`,
                    backgroundColor: "action.hover",
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 26,
                      height: 22,
                      px: 0.75,
                      borderRadius: 999,
                      backgroundColor: color.warning.soft,
                      color: color.warning.ink,
                      fontSize: 11.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {u.count}
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.question}
                  </Typography>
                  {u.ticketId && (
                    <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0 }}>
                      sent to office
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </FormSection>
  )
}

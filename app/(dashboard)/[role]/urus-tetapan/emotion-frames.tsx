"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import CircularProgress from "@mui/material/CircularProgress"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { uploadConciergeFrame, removeConciergeFrame } from "@/lib/ai/admin-actions"
import type { ConciergeEmotion, ConciergeFrames } from "@/lib/ai/config"

const EMOTIONS: { value: ConciergeEmotion; label: string; hint: string }[] = [
  { value: "idle", label: "Idle", hint: "Resting / waiting — shown on the floating button." },
  { value: "thinking", label: "Thinking", hint: "While KIZ-AI is reading and writing an answer." },
  { value: "happy", label: "Happy", hint: "Greeting and after a good answer." },
]

function Slot({
  emotion,
  frame,
  url,
  onChanged,
  onError,
}: {
  emotion: ConciergeEmotion
  frame: number
  url: string
  onChanged: () => void
  onError: (msg: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("emotion", emotion)
      fd.append("frame", String(frame))
      fd.append("file", file)
      const result = await uploadConciergeFrame(fd)
      if (result.success) onChanged()
      else onError(result.error ?? "Upload failed.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const result = await removeConciergeFrame(emotion, frame)
      if (result.success) onChanged()
      else onError("Couldn't remove the frame.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        component="button"
        type="button"
        aria-label={url ? `Replace ${emotion} frame ${frame + 1}` : `Upload ${emotion} frame ${frame + 1}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        sx={{
          width: 64,
          height: 64,
          p: 0,
          borderRadius: `${radius.input}px`,
          border: url ? "1px solid" : "1.5px dashed",
          borderColor: url ? "divider" : color.borderStrong,
          backgroundColor: color.canvasSunk,
          cursor: "pointer",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": { borderColor: color.brand[400] },
        }}
      >
        {busy ? (
          <CircularProgress size={18} />
        ) : url ? (
          <Box component="img" src={url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <KIcon icon="add_photo_alternate" size={22} sx={{ color: "text.disabled" }} />
        )}
      </Box>
      {url && !busy && (
        <Box
          component="button"
          type="button"
          aria-label="Remove frame"
          onClick={remove}
          sx={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            color: color.danger.main,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 0,
          }}
        >
          <KIcon icon="close" size={13} />
        </Box>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp,image/jpeg"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
        }}
      />
    </Box>
  )
}

export function EmotionFrames({
  frames,
  onError,
}: {
  frames: ConciergeFrames
  onError: (msg: string) => void
}) {
  const router = useRouter()

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Emotion frames
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
        Upload up to 3 PNG frames per emotion — KIZ-AI loops them smoothly. Use the same canvas size for every frame.
        Images are downscaled to 256px automatically.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
        {EMOTIONS.map((emo) => (
          <Box key={emo.value} sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ width: 120, flexShrink: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {emo.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", lineHeight: 1.35 }}>
                {emo.hint}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.25 }}>
              {[0, 1, 2].map((i) => (
                <Slot
                  key={i}
                  emotion={emo.value}
                  frame={i}
                  url={frames[emo.value][i] ?? ""}
                  onChanged={() => router.refresh()}
                  onError={onError}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

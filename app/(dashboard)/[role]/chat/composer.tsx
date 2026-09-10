"use client"

import { useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Menu from "@mui/material/Menu"
import { CHAT_QUICK_EMOJIS } from "@/lib/chat-meta"
import { color, radius } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"
import type { ChatReplyPreviewView } from "./chat-types"

/**
 * Chat composer: text input with Enter-to-send, a curated emoji picker, an
 * image/PDF attachment (uploaded through /api/upload → /uploads/chat), a clear
 * round send button, and a "Replying to …" strip when a reply is armed.
 */

export interface ComposerDraft {
  text: string
  attachment: { url: string; type: "image" | "pdf" | "file"; name: string } | null
}

interface Props {
  sending: boolean
  replyPreview: ChatReplyPreviewView | null
  onCancelReply: () => void
  onSend: (draft: ComposerDraft) => Promise<void>
}

export function Composer({ sending, replyPreview, onCancelReply, onSend }: Props) {
  const [text, setText] = useState("")
  const [attachment, setAttachment] = useState<ComposerDraft["attachment"]>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSend = Boolean(text.trim() || attachment) && !sending && !uploading

  function reset() {
    setText("")
    setAttachment(null)
    setError(null)
  }

  async function handleSend() {
    if (!canSend) return
    try {
      await onSend({ text, attachment })
      reset()
      onCancelReply()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send — try again.")
    }
  }

  async function pickFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("dir", "chat")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Upload failed — try again.")
      }
      const type: "image" | "pdf" | "file" = file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf"
          ? "pdf"
          : "file"
      setAttachment({ url: data.url, type, name: file.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed — try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box
      sx={{
        p: { xs: 1.25, sm: 1.5 },
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      {/* Replying strip */}
      {replyPreview && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: `${radius.input}px`,
            backgroundColor: color.canvasSunk,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <KIcon icon="reply" size={15} sx={{ color: color.brand[600], flexShrink: 0 }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 650, color: color.brand[800] }}>
              Replying to {replyPreview.senderName}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {replyPreview.text}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onCancelReply} aria-label="Cancel reply">
            <KIcon icon="close" size={16} />
          </IconButton>
        </Box>
      )}

      {/* Attachment preview */}
      {attachment && (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            mb: 1,
            px: 1,
            py: 0.5,
            borderRadius: `${radius.input}px`,
            backgroundColor: color.canvasSunk,
            border: "1px solid",
            borderColor: "divider",
            maxWidth: "100%",
          }}
        >
          <KIcon icon={attachment.type === "image" ? "image" : "description"} size={16} sx={{ color: "text.secondary", flexShrink: 0 }} />
          <Typography variant="caption" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attachment.name}
          </Typography>
          <IconButton size="small" onClick={() => setAttachment(null)} aria-label="Remove attachment">
            <KIcon icon="close" size={14} />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.75 }}>
        {/* Attachment */}
        <Tooltip title="Attach photo or PDF">
          <IconButton
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            sx={{ width: 38, height: 38, flexShrink: 0, alignSelf: "center" }}
          >
            {uploading ? <KIcon icon="hourglass_top" size={20} /> : <KIcon icon="attach_file" size={20} />}
          </IconButton>
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => {
            pickFile(e.target.files?.[0])
            e.target.value = ""
          }}
        />

        {/* Text */}
        <Box
          ref={inputRef}
          component="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={attachment ? "Add a caption…" : "Type a message…"}
          disabled={sending || uploading}
          aria-label="Message"
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 42,
            px: 1.75,
            borderRadius: `${radius.pill}px`,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.default",
            fontSize: 14,
            outline: "none",
            color: "text.primary",
            "&:focus": { borderColor: color.brand[400], boxShadow: `0 0 0 3px ${color.brand[100]}` },
            "&:disabled": { opacity: 0.6 },
          }}
        />

        {/* Emoji */}
        <Tooltip title="Emoji">
          <IconButton
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
            sx={{ width: 38, height: 38, flexShrink: 0, alignSelf: "center" }}
            aria-label="Emoji"
          >
            <KIcon icon="sentiment_satisfied" size={20} />
          </IconButton>
        </Tooltip>

        {/* Send */}
        <Tooltip title={canSend ? "Send" : "Type a message"}>
          <Box
            component="button"
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send"
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              alignSelf: "center",
              borderRadius: "50%",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canSend ? "pointer" : "default",
              backgroundColor: canSend ? color.brand[600] : "action.hover",
              color: canSend ? "#fff" : "text.disabled",
              boxShadow: canSend ? "0 4px 14px rgba(8,145,178,0.28)" : "none",
              transition: "background-color 140ms, box-shadow 140ms",
              "&:hover": canSend ? { backgroundColor: color.brand[700] } : {},
              "&:active": canSend ? { opacity: 0.85 } : {},
            }}
          >
            <KIcon icon="send" size={19} />
          </Box>
        </Tooltip>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.75, px: 0.5 }}>
          {error}
        </Typography>
      )}

      {/* Emoji quick menu */}
      <Menu
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, px: 1, py: 1, maxWidth: 260 } } }}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0.25 }}>
          {CHAT_QUICK_EMOJIS.map((e) => (
            <Box
              key={e}
              component="button"
              type="button"
              onClick={() => {
                setText((t) => t + e)
                inputRef.current?.focus()
              }}
              sx={{
                fontSize: 20,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                borderRadius: 1,
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              {e}
            </Box>
          ))}
        </Box>
      </Menu>
    </Box>
  )
}

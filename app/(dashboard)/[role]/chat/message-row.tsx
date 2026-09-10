"use client"

import { useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import { chatRoleBadge, CHAT_REACTION_EMOJIS } from "@/lib/chat-meta"
import { color, radius } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"
import type { ChatMessageView } from "./chat-types"

/**
 * One community-chat bubble. Others sit left with avatar + name + role badge +
 * timestamp; yours sit right on the brand ink. A reply shows a quoted preview
 * of the parent. Reactions appear as tappable emoji chips under the bubble.
 * Hovering a message reveals a small action bar (React · Reply · More).
 */

const TIME_FMT = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  hour: "2-digit",
  minute: "2-digit",
})

function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso))
}

function initialOf(name: string): string {
  return (name.trim().charAt(0) || "K").toUpperCase()
}

export function MessageAvatar({
  name,
  url,
  size = 32,
}: {
  name: string
  url: string | null
  size?: number
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        backgroundColor: color.neutral.soft,
        color: color.neutral.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 600,
        border: "1px solid",
        borderColor: "divider",
        userSelect: "none",
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initialOf(name)
      )}
    </Box>
  )
}

function Attachment({ msg, mine }: { msg: ChatMessageView; mine: boolean }) {
  const { attachmentUrl, attachmentType, attachmentName } = msg
  if (!attachmentUrl) return null

  if (attachmentType === "image") {
    return (
      <Box
        component="a"
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ display: "block", mt: msg.message ? 1 : 0, maxWidth: 320 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachmentUrl}
          alt={attachmentName ?? "Chat attachment"}
          loading="lazy"
          style={{
            display: "block",
            width: "100%",
            maxHeight: 320,
            objectFit: "cover",
            borderRadius: 12,
            border: mine ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(9,9,11,0.06)",
          }}
        />
      </Box>
    )
  }

  return (
    <Box
      component="a"
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        mt: msg.message ? 1 : 0,
        maxWidth: 280,
        px: 1.5,
        py: 1,
        borderRadius: `${radius.input}px`,
        textDecoration: "none",
        ...(mine
          ? { backgroundColor: "rgba(255,255,255,0.14)", color: "#fff" }
          : { backgroundColor: color.canvasSunk, color: "text.primary" }),
      }}
    >
      <KIcon icon="description" size={18} />
      <Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {attachmentName || "Attachment"}
      </Typography>
      <KIcon icon="open_in_new" size={14} sx={{ opacity: 0.7 }} />
    </Box>
  )
}

interface Props {
  msg: ChatMessageView
  mine: boolean
  canModerate: boolean
  onReact: (emoji: string) => void
  onReply: () => void
  onReport: () => void
  onDelete: () => void
}

export function MessageRow({ msg, mine, canModerate, onReact, onReply, onReport, onDelete }: Props) {
  const badge = chatRoleBadge(msg.sender.role)
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  const canDelete = canModerate && !mine

  return (
    <Box ref={rowRef} className="chat-row" sx={{ display: "flex", gap: 1.25, alignItems: "flex-end" }}>
      {!mine && <MessageAvatar name={msg.sender.name} url={msg.sender.avatarUrl} />}

      <Box sx={{ maxWidth: { xs: "82%", sm: "76%" }, minWidth: 0, display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
        {/* Sender + time + quick actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.625,
            mb: 0.375,
            px: 0.375,
            flexWrap: "wrap",
            justifyContent: mine ? "flex-end" : "flex-start",
          }}
        >
          {mine ? (
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.disabled" }}>
              You
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ fontWeight: 650, color: "text.primary" }}>
              {msg.sender.name}
            </Typography>
          )}
          <Box
            component="span"
            sx={{
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              px: 0.75,
              py: 0.4,
              borderRadius: `${radius.pill}px`,
              backgroundColor: badge.tone.soft,
              color: badge.tone.ink,
            }}
          >
            {badge.label}
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {formatTime(msg.createdAt)}
          </Typography>
        </Box>

        {/* Bubble */}
        <Box
          sx={{
            px: 1.5,
            py: 0.9,
            borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            backgroundColor: mine ? color.brand[900] : "action.hover",
            color: mine ? "#fff" : "text.primary",
            fontSize: 14,
            maxWidth: "100%",
            minWidth: 0,
          }}
        >
          {msg.replyPreview && (
            <Box
              sx={{
                mb: 0.75,
                pl: 1,
                borderLeft: "2.5px solid",
                borderColor: mine ? "rgba(255,255,255,0.45)" : color.brand[300],
              }}
            >
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 650,
                  color: mine ? "rgba(255,255,255,0.85)" : color.brand[700],
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                ↪ {msg.replyPreview.senderName}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  color: mine ? "rgba(255,255,255,0.72)" : "text.secondary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {msg.replyPreview.text}
              </Typography>
            </Box>
          )}

          <Attachment msg={msg} mine={mine} />

          {msg.message && (
            <Typography
              sx={{
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {msg.message}
            </Typography>
          )}
        </Box>

        {/* Reactions */}
        {msg.reactions.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.375, mt: 0.5, px: 0.5 }}>
            {msg.reactions.map((r) => (
              <Box
                key={r.emoji}
                component="button"
                type="button"
                onClick={() => onReact(r.emoji)}
                aria-pressed={r.mine}
                title={r.mine ? `Remove ${r.emoji}` : `React ${r.emoji}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.375,
                  height: 24,
                  px: 0.75,
                  borderRadius: `${radius.pill}px`,
                  border: "1px solid",
                  borderColor: r.mine ? color.brand[300] : "divider",
                  backgroundColor: r.mine ? color.brand[50] : "background.paper",
                  fontSize: 12.5,
                  cursor: "pointer",
                  lineHeight: 1,
                  WebkitTapHighlightColor: "transparent",
                  "&:active": { opacity: 0.7 },
                }}
              >
                <Box component="span" sx={{ fontSize: 13, lineHeight: 1 }}>{r.emoji}</Box>
                <Box component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: r.mine ? color.brand[800] : "text.secondary" }}>
                  {r.count}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Hover/touch action bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            mt: 0.25,
            px: 0.5,
            opacity: { md: 0 },
            "@media (hover: none)": { opacity: 1 },
            transition: "opacity 140ms",
            ".chat-row:hover &": { opacity: 1 },
          }}
        >
          <Tooltip title="Add reaction">
            <IconButton size="small" sx={{ width: 26, height: 26 }} onClick={(e) => setEmojiAnchor(e.currentTarget)}>
              <KIcon icon="sentiment_satisfied" size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reply">
            <IconButton size="small" sx={{ width: 26, height: 26 }} onClick={onReply}>
              <KIcon icon="reply" size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="More">
            <IconButton size="small" sx={{ width: 26, height: 26 }} onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <KIcon icon="more_horiz" size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {mine && <MessageAvatar name={msg.sender.name} url={msg.sender.avatarUrl} />}

      {/* Quick reaction popover */}
      <Menu
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, px: 1, py: 1 } } }}
      >
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {CHAT_REACTION_EMOJIS.map((e) => (
            <Box
              key={e}
              component="button"
              type="button"
              onClick={() => {
                setEmojiAnchor(null)
                onReact(e)
              }}
              sx={{
                fontSize: 20,
                width: 36,
                height: 36,
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

      {/* More menu */}
      <Menu
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            onReply()
          }}
        >
          <KIcon icon="reply" size={17} style={{ marginRight: 10 }} />
          Reply
        </MenuItem>
        {!mine && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              onReport()
            }}
          >
            <KIcon icon="flag" size={17} style={{ marginRight: 10 }} />
            Report message
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              onDelete()
            }}
            sx={{ color: "error.main" }}
          >
            <KIcon icon="delete" size={17} style={{ marginRight: 10 }} />
            Delete message
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}

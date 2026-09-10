"use client"

import Dialog from "@mui/material/Dialog"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { ReactionPills } from "./reaction-pills"
import type { AnnouncementCard } from "./announcement-feed"
import { announcementTagMeta, type AnnouncementReactionType } from "@/lib/announcement-meta"
import { color, radius } from "@/lib/theme"
import { formatMalaysia } from "@/lib/timezone"

interface Props {
  announcement: AnnouncementCard | null
  open: boolean
  canInteract: boolean
  busy: boolean
  onReact: (type: AnnouncementReactionType) => void
  onClose: () => void
}

export function AnnouncementDialog({ announcement, open, canInteract, busy, onReact, onClose }: Props) {
  if (!announcement) return null

  const a = announcement
  const meta = announcementTagMeta(a.tag)
  const isImportant = a.tag === "important"
  const noted = a.mine.includes("noted")

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: { sx: { borderRadius: `${radius.sheet}px`, backgroundImage: "none", overflow: "hidden" } },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          maxHeight: { xs: "88vh", sm: "min(86vh, 780px)" },
        }}
      >
        {/* ── Header: category + close ─────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: `${radius.input}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: meta.tone.soft,
              color: meta.tone.ink,
            }}
          >
            <KIcon icon={meta.icon} size={20} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              sx={{ textTransform: "capitalize", fontSize: 14.5, fontWeight: 650, letterSpacing: "-0.01em" }}
            >
              {meta.label}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Posted by {a.posterName} · {formatMalaysia(new Date(a.createdAt))}
            </Typography>
          </Box>
          {a.isPinned && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.375,
                borderRadius: 999,
                backgroundColor: color.neutral.soft,
                color: color.neutral.ink,
                fontSize: 11.5,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <KIcon icon="push_pin" size={13} filled />
              Pinned
            </Box>
          )}
          <Button
            onClick={onClose}
            aria-label="Close"
            sx={{
              minWidth: 0,
              width: 34,
              height: 34,
              borderRadius: 999,
              color: "text.secondary",
              p: 0,
              flexShrink: 0,
            }}
          >
            <KIcon icon="close" size={20} />
          </Button>
        </Box>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <Box sx={{ overflowY: "auto", flex: 1, px: { xs: 2.5, sm: 4 }, py: { xs: 2.5, sm: 3.5 } }}>
          <Typography
            sx={{
              fontSize: { xs: 21, sm: 24 },
              fontWeight: 660,
              lineHeight: 1.22,
              letterSpacing: "-0.028em",
              mb: 1.75,
            }}
          >
            {a.title}
          </Typography>

          {a.expiresAt && (
            <Typography
              variant="caption"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: color.warning.ink, mb: 1.5 }}
            >
              <KIcon icon="schedule" size={13} />
              Relevant until {new Date(a.expiresAt).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric" })}
            </Typography>
          )}

          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontSize: { xs: 14.5, sm: 15.5 },
              lineHeight: 1.65,
            }}
          >
            {a.content}
          </Typography>

          {a.attachmentType === "image" && a.attachmentUrl && (
            <Box
              component="a"
              href={a.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: "block", mt: 2.5 }}
            >
              <Box
                component="img"
                src={a.attachmentUrl}
                alt=""
                sx={{
                  width: "100%",
                  maxWidth: 520,
                  aspectRatio: "16/9",
                  objectFit: "cover",
                  borderRadius: `${radius.card}px`,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            </Box>
          )}

          {a.attachmentType === "pdf" && a.attachmentUrl && (
            <Box
              component="a"
              href={a.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                mt: 2.5,
                px: 1.5,
                py: 0.875,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                fontSize: 13,
                fontWeight: 550,
                color: "text.primary",
                textDecoration: "none",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <KIcon icon="description" size={16} />
              Open PDF
            </Box>
          )}

          {/* ── Reactions ─────────────────────────────────────────────────── */}
          <Box
            sx={{
              mt: 3.5,
              pt: 2.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.25, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 650, color: "text.primary" }}>
                {canInteract ? "How did this land with you?" : "Resident reactions"}
              </Typography>
              {isImportant && canInteract && !noted && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Tapping 👍 Noted counts as your acknowledgement.
                </Typography>
              )}
            </Box>
            <ReactionPills
              counts={a.reactions}
              mine={a.mine}
              interactive={canInteract}
              onReact={onReact}
              busy={busy}
              size="md"
            />
            {isImportant && canInteract && noted && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.625,
                  mt: 1.5,
                  px: 1.25,
                  py: 0.625,
                  borderRadius: 999,
                  backgroundColor: color.success.soft,
                  color: color.success.ink,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <KIcon icon="check" size={14} />
                Acknowledged — the office knows you&apos;ve seen this.
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            px: { xs: 2.5, sm: 3 },
            py: { xs: 1.5, sm: 2 },
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Button onClick={onClose} variant="contained" size="small" startIcon={<KIcon icon="close" size={16} />}>
            Close
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

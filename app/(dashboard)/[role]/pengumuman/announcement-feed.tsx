"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ReactionPills, type ReactionCounts } from "./reaction-pills"
import { AnnouncementDialog } from "./announcement-dialog"
import { announcementTagMeta, type AnnouncementReactionType } from "@/lib/announcement-meta"
import { color, radius } from "@/lib/theme"
import { TIMEZONE } from "@/lib/timezone"
import { markAnnouncementRead, toggleAnnouncementReaction } from "./actions"

/**
 * Member announcement feed — a responsive card grid (2-up on desktop, full
 * width on phones). Each card shows category colour/icon, an unread dot that
 * clears when the announcement is opened, a multi-line summary, resident
 * reactions (👍 Noted / ❤️ Excited / 🙋 Interested) and a "View details"
 * affordance that opens a full-reading dialog.
 */

export interface AnnouncementCard {
  id: string
  title: string
  content: string
  tag: string
  attachmentUrl: string | null
  attachmentType: string | null
  isPinned: boolean
  createdAt: Date
  expiresAt: Date | null
  posterName: string
  reactions: ReactionCounts
  mine: AnnouncementReactionType[]
  unread: boolean
}

interface Props {
  announcements: AnnouncementCard[]
  tags: string[]
  /** ahli/staf can react, mark read and acknowledge important announcements. */
  canInteract: boolean
}

const clamp = (lines: number) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
})

const dateFmt = new Intl.DateTimeFormat("en-MY", { timeZone: TIMEZONE, day: "numeric", month: "short" })
const shortDate = (d: Date) => dateFmt.format(new Date(d))
const isFresh = (d: Date) => Date.now() - new Date(d).getTime() < 48 * 3600_000

export function AnnouncementFeed({ announcements, tags, canInteract }: Props) {
  const router = useRouter()
  const [activeTag, setActiveTag] = useState<string>("all")
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Mount guard: the "New" label depends on Date.now(), so keep SSR and the
  // first client render identical to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(id)
  }, [])
  const isFreshLabel = (d: Date) => mounted && isFresh(d)

  const filtered = useMemo(
    () => (activeTag === "all" ? announcements : announcements.filter((a) => a.tag === activeTag)),
    [announcements, activeTag]
  )

  const unreadCount = useMemo(() => announcements.filter((a) => a.unread).length, [announcements])
  const active = useMemo(() => announcements.find((a) => a.id === openId) ?? null, [announcements, openId])

  async function openAnnouncement(a: AnnouncementCard) {
    setOpenId(a.id)
    if (canInteract && a.unread) {
      try {
        await markAnnouncementRead(a.id)
        router.refresh()
      } catch {
        // Reading still proceeds even if the read-marker fails to save.
      }
    }
  }

  async function handleReact(a: AnnouncementCard, type: AnnouncementReactionType) {
    if (!canInteract) return
    setBusyId(a.id)
    try {
      await toggleAnnouncementReaction(a.id, type)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't save your reaction — try again.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box>
      {/* Unread summary strip */}
      {canInteract && unreadCount > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            mb: 2.5,
            px: { xs: 2, sm: 2.25 },
            py: 1.25,
            borderRadius: `${radius.card}px`,
            border: "1px solid",
            borderColor: color.brand[200],
            backgroundColor: color.brand[50],
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: color.brand[600],
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <KIcon icon="mark_email_unread" size={17} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 650, color: color.brand[900], letterSpacing: "-0.008em" }}>
              {unreadCount} unread announcement{unreadCount === 1 ? "" : "s"} for you
            </Typography>
            <Typography variant="caption" sx={{ color: color.brand[700], display: "block" }}>
              Open an announcement to clear its “New” dot.
            </Typography>
          </Box>
        </Box>
      )}

      {/* Scrollable filter rail */}
      <Box
        className="scroll-x"
        sx={{ gap: 1, mb: 2.5, mx: { xs: -2, sm: 0 }, px: { xs: 2, sm: 0 } }}
      >
        {["all", ...tags].map((tag) => {
          const active = activeTag === tag
          const meta = tag === "all" ? null : announcementTagMeta(tag)
          return (
            <Box
              key={tag}
              component="button"
              onClick={() => setActiveTag(tag)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.625,
                height: 32,
                px: 1.75,
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? "transparent" : "divider",
                backgroundColor: active ? "text.primary" : "background.paper",
                color: active ? "background.paper" : "text.secondary",
                fontSize: 13,
                fontWeight: 550,
                letterSpacing: "-0.011em",
                textTransform: "capitalize",
                cursor: "pointer",
                whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                transition: "background-color 140ms, color 140ms, border-color 140ms",
                "&:active": { opacity: 0.7 },
              }}
            >
              {meta && <KIcon icon={meta.icon} size={15} filled={active} />}
              {tag === "all" ? "All" : meta?.label ?? tag}
            </Box>
          )
        })}
      </Box>

      {filtered.length === 0 ? (
        <KEmpty icon="campaign" title="Nothing to see here" body="Try a different tag." compact />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
            gap: { xs: 1.5, sm: 1.5, md: 2 },
            alignItems: "stretch",
          }}
        >
          {filtered.map((a) => (
            <AnnouncementCardView
              key={a.id}
              announcement={a}
              canInteract={canInteract}
              busy={busyId === a.id}
              fullWidth={a.isPinned}
              freshLabel={isFreshLabel(a.createdAt)}
              onOpen={() => openAnnouncement(a)}
              onReact={(type) => handleReact(a, type)}
            />
          ))}
        </Box>
      )}

      <AnnouncementDialog
        announcement={active}
        open={Boolean(active)}
        canInteract={canInteract}
        busy={busyId === active?.id}
        onReact={(type) => active && handleReact(active, type)}
        onClose={() => setOpenId(null)}
      />
    </Box>
  )
}

function AnnouncementCardView({
  announcement: a,
  canInteract,
  busy,
  fullWidth,
  freshLabel,
  onOpen,
  onReact,
}: {
  announcement: AnnouncementCard
  canInteract: boolean
  busy: boolean
  fullWidth: boolean
  freshLabel: boolean
  onOpen: () => void
  onReact: (type: AnnouncementReactionType) => void
}) {
  const meta = announcementTagMeta(a.tag)

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpen()
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        height: "100%",
        gridColumn: fullWidth ? "1 / -1" : undefined,
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        p: { xs: 2, sm: 2.25 },
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        transition: "border-color 160ms ease, transform 160ms ease",
        "@media (hover: hover)": {
          "&:hover": { borderColor: color.brand[300], transform: "translateY(-1px)" },
          "&:hover .card-arrow": { transform: "translateX(2px)" },
        },
        "&:focus-visible": { outline: `2px solid ${color.brand[500]}`, outlineOffset: 2 },
      }}
    >
      {/* ── Header: category tile + chips + date ──────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${radius.input}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: meta.tone.soft,
            color: meta.tone.ink,
          }}
        >
          <KIcon icon={meta.icon} size={21} />
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mb: 0.75 }}>
            <Box
              component="span"
              sx={{
                textTransform: "capitalize",
                fontSize: 11,
                fontWeight: 650,
                px: 1,
                py: 0.375,
                borderRadius: 999,
                backgroundColor: meta.tone.soft,
                color: meta.tone.ink,
              }}
            >
              {meta.label}
            </Box>
            {a.isPinned && (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.375,
                  fontSize: 11,
                  fontWeight: 600,
                  px: 1,
                  py: 0.375,
                  borderRadius: 999,
                  backgroundColor: color.neutral.soft,
                  color: color.neutral.ink,
                }}
              >
                <KIcon icon="push_pin" size={12} filled />
                Pinned
              </Box>
            )}
            {canInteract && a.unread && (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: 11,
                  fontWeight: 650,
                  px: 1,
                  py: 0.375,
                  borderRadius: 999,
                  backgroundColor: color.success.soft,
                  color: color.success.ink,
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: color.success.main,
                    boxShadow: `0 0 0 3px ${color.success.soft}`,
                  }}
                />
                {freshLabel ? "New" : "Unread"}
              </Box>
            )}
          </Box>
          <Typography
            sx={{
              fontWeight: 620,
              fontSize: { xs: 16, sm: 16.5 },
              lineHeight: 1.3,
              letterSpacing: "-0.02em",
              ...clamp(2),
            }}
          >
            {a.title}
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0, mt: 0.25, whiteSpace: "nowrap" }}>
          {shortDate(a.createdAt)}
        </Typography>
      </Box>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mt: 1.25,
          lineHeight: 1.55,
          fontSize: 13.5,
          ...clamp(3),
        }}
      >
        {a.content}
      </Typography>

      {a.attachmentType === "image" && a.attachmentUrl && (
        <Box
          component="img"
          src={a.attachmentUrl}
          alt=""
          sx={{
            display: "block",
            width: "100%",
            aspectRatio: "16/7",
            objectFit: "cover",
            borderRadius: `${radius.card}px`,
            border: "1px solid",
            borderColor: "divider",
            mt: 1.5,
          }}
        />
      )}

      {/* ── Footer: reactions + view details ──────────────────────────────── */}
      <Box sx={{ mt: "auto", pt: 1.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            borderTop: "1px solid",
            borderColor: "divider",
            pt: 1.5,
          }}
        >
          <ReactionPills
            counts={a.reactions}
            mine={a.mine}
            interactive={canInteract}
            onReact={onReact}
            busy={busy}
            size="sm"
          />

          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
              color: color.brand[700],
              fontSize: 12.5,
              fontWeight: 700,
              letterSpacing: "-0.005em",
              flexShrink: 0,
              ml: "auto",
            }}
          >
            View details
            <KIcon
              icon="arrow_forward"
              size={14}
              className="card-arrow"
              sx={{ transition: "transform 160ms ease" }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

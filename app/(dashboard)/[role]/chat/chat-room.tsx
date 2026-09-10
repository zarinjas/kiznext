"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Drawer from "@mui/material/Drawer"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { MessageRow } from "./message-row"
import { Composer } from "./composer"
import { CommunityPanel } from "./community-panel"
import { UserProfileDialog } from "./user-profile-dialog"
import {
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  toggleChatReaction,
  reportChatMessage,
  dismissChatReport,
  touchChatPresence,
} from "./actions"
import { PINNED_GUIDELINE_STRIP, CHAT_REPORT_REASONS, ONLINE_WINDOW_MS } from "@/lib/chat-meta"
import { color, radius } from "@/lib/theme"
import type { ChatMessageView, ChatReplyPreviewView, ChatSnapshotView } from "./chat-types"

const DAY_FMT = new Intl.DateTimeFormat("en-MY", {
  timeZone: "Asia/Kuala_Lumpur",
  weekday: "short",
  day: "numeric",
  month: "short",
})

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const fmt = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
  const k = fmt(d)
  if (k === fmt(today)) return "Today"
  if (k === fmt(yesterday)) return "Yesterday"
  return DAY_FMT.format(d)
}

interface Props {
  role: string
  userId: string
  initialSnapshot: ChatSnapshotView
}

export function ChatRoom({ role, userId, initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState<ChatSnapshotView>(initialSnapshot)
  const [sending, setSending] = useState(false)
  const [replyPreview, setReplyPreview] = useState<ChatReplyPreviewView | null>(null)
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [reportMsg, setReportMsg] = useState<ChatMessageView | null>(null)
  const [deleteMsg, setDeleteMsg] = useState<ChatMessageView | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [modOpen, setModOpen] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)

  const canModerate = snapshot.canModerate
  const onlineLabel = snapshot.onlineCount > 0 ? `${snapshot.onlineCount} online` : "No one online right now"

  // ── Poll every 3s + throttled presence heartbeat ─────────────────────────
  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const next = await getChatMessages()
        if (alive) setSnapshot(next)
      } catch {
        // transient — keep the last good frame
      }
    }
    const id = window.setInterval(poll, 3000)
    poll()

    // Presence: heartbeat every 15s; anyone seen within ONLINE_WINDOW counts.
    const beat = () => touchChatPresence().catch(() => {})
    beat()
    const hb = window.setInterval(beat, Math.min(15000, ONLINE_WINDOW_MS / 2))
    return () => {
      alive = false
      window.clearInterval(id)
      window.clearInterval(hb)
    }
  }, [])

  // ── Auto-scroll: follow new messages only while pinned near the bottom ───
  const messages = snapshot.messages
  const prevCount = useRef(messages.length)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const grew = messages.length > prevCount.current
    prevCount.current = messages.length
    if (grew && nearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  // Day dividers between consecutive messages.
  const rows = useMemo(() => {
    const out: Array<{ kind: "day" | "msg"; key: string; iso?: string; msg?: ChatMessageView }> = []
    let prev: string | null = null
    for (const m of messages) {
      const k = dayKey(m.createdAt)
      if (k !== prev) {
        out.push({ kind: "day", key: `d-${k}`, iso: m.createdAt })
        prev = k
      }
      out.push({ kind: "msg", key: m.id, msg: m })
    }
    return out
  }, [messages])

  async function handleSend(draft: { text: string; attachment: { url: string; type: string; name: string } | null }) {
    setSending(true)
    try {
      await sendChatMessage(draft.text, {
        replyToId,
        attachment: draft.attachment
          ? { url: draft.attachment.url, type: draft.attachment.type as "image" | "pdf" | "file", name: draft.attachment.name }
          : null,
      })
      nearBottomRef.current = true
      const next = await getChatMessages()
      setSnapshot(next)
      setReplyPreview(null)
      setReplyToId(null)
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    } finally {
      setSending(false)
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    try {
      await toggleChatReaction(messageId, emoji)
      const next = await getChatMessages()
      setSnapshot(next)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't save your reaction.")
    }
  }

  function armReply(msg: ChatMessageView) {
    setReplyToId(msg.id)
    setReplyPreview({ senderName: msg.sender.name, text: msg.message || "📎 Attachment" })
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }

  async function handleDelete(msg: ChatMessageView) {
    try {
      await deleteChatMessage(msg.id)
      setDeleteMsg(null)
      const next = await getChatMessages()
      setSnapshot(next)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't delete the message.")
    }
  }

  async function handleReport(reason: string, note: string) {
    if (!reportMsg) return
    try {
      await reportChatMessage(reportMsg.id, reason, note)
      setReportMsg(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't submit the report.")
    }
  }

  async function handleDismissReport(reportId: string) {
    try {
      await dismissChatReport(reportId)
      const next = await getChatMessages()
      setSnapshot(next)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't dismiss the report.")
    }
  }

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: { xs: 1.75, sm: 2.25 }, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 640, fontSize: { xs: 15, sm: 16 }, letterSpacing: "-0.015em" }}>
            Community Chat
          </Typography>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.375, borderRadius: 999, backgroundColor: color.success.soft, color: color.success.ink, fontSize: 11, fontWeight: 650 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color.success.main }} />
            {snapshot.onlineCount > 0 ? "Live" : "Idle"}
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
          {snapshot.memberCount} members · {onlineLabel}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
        {canModerate && (
          <Tooltip title="Review reports">
            <Box sx={{ position: "relative" }}>
              <IconButton size="small" onClick={() => setModOpen(true)} aria-label="Review reports">
                <KIcon icon="flag" size={19} />
              </IconButton>
              {snapshot.reports.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 16,
                    height: 16,
                    px: 0.375,
                    borderRadius: 999,
                    backgroundColor: color.danger.main,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {snapshot.reports.length}
                </Box>
              )}
            </Box>
          </Tooltip>
        )}
        <Tooltip title="Community info">
          <IconButton size="small" onClick={() => setInfoOpen(true)} aria-label="Community info" sx={{ display: { lg: "none" } }}>
            <KIcon icon="info" size={19} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <PageHeader
        overline="Community"
        title="Community Chat"
        subtitle="One shared room for KIZ residents, staff and fellows."
      />

      <Box sx={{ display: "flex", gap: { lg: 2.5 }, alignItems: "flex-start" }}>
        {/* ── Chat column ─────────────────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            height: { xs: "calc(100dvh - 196px)", md: "calc(100dvh - 150px)" },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: `${radius.cardLg}px`,
            overflow: "hidden",
            backgroundColor: "background.paper",
          }}
        >
          {header}

          {/* Pinned guidelines strip */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
              px: { xs: 1.75, sm: 2.25 },
              py: 0.625,
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: color.canvasSunk,
            }}
          >
            <KIcon icon="push_pin" size={14} sx={{ color: color.brand[600], flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              Pinned:
            </Typography>
            {PINNED_GUIDELINE_STRIP.map((g, i) => (
              <Typography
                key={g}
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: { xs: i > 1 ? "none" : "inline", sm: "inline" },
                  whiteSpace: "nowrap",
                }}
              >
                {i > 0 && <Box component="span" sx={{ mx: 0.5, color: "text.disabled" }}>·</Box>}
                {g}
              </Typography>
            ))}
            <Button
              size="small"
              onClick={() => setInfoOpen(true)}
              sx={{ ml: "auto", minWidth: 0, px: 0.75, minHeight: 22, fontSize: 11.5 }}
            >
              <KIcon icon="chevron_right" size={14} style={{ marginRight: 2 }} />
              Guidelines
            </Button>
          </Box>

          {/* Messages */}
          <Box
            ref={scrollRef}
            sx={{
              flex: 1,
              overflowY: "auto",
              px: { xs: 1.5, sm: 2 },
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              backgroundImage: "radial-gradient(720px 420px at 100% 0%, rgba(139,124,238,0.05), transparent 60%), radial-gradient(680px 420px at 0% 100%, rgba(8,145,178,0.045), transparent 55%)",
              "&::-webkit-scrollbar": { width: 6 },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "divider", borderRadius: 3 },
            }}
          >
            {messages.length === 0 && (
              <Box sx={{ my: "auto" }}>
                <KEmpty
                  icon="forum"
                  title="Say hi to your neighbours"
                  body="Be the first to start the conversation. Keep it kind — community guidelines are pinned above."
                  compact
                />
              </Box>
            )}
            {rows.map((row) =>
              row.kind === "day" ? (
                <Box key={row.key} sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.375,
                      borderRadius: 999,
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      color: "text.disabled",
                      fontSize: 10.5,
                      fontWeight: 650,
                    }}
                  >
                    {dayLabel(row.iso!)}
                  </Box>
                </Box>
              ) : (
                <MessageRow
                  key={row.key}
                  msg={row.msg!}
                  mine={row.msg!.sender.id === userId}
                  canModerate={canModerate}
                  onReact={(emoji) => handleReact(row.msg!.id, emoji)}
                  onReply={() => armReply(row.msg!)}
                  onReport={() => setReportMsg(row.msg!)}
                  onDelete={() => setDeleteMsg(row.msg!)}
                  onViewSender={canModerate ? () => setProfileUserId(row.msg!.sender.id) : undefined}
                />
              )
            )}
          </Box>

          {/* Composer */}
          <Composer
            sending={sending}
            replyPreview={replyPreview}
            onCancelReply={() => {
              setReplyPreview(null)
              setReplyToId(null)
            }}
            onSend={handleSend}
          />
        </Box>

        {/* ── Right rail (desktop) ────────────────────────────────────────── */}
        <Box
          sx={{
            display: { xs: "none", lg: "block" },
            width: 340,
            flexShrink: 0,
            maxHeight: "calc(100dvh - 160px)",
            overflowY: "auto",
            pr: 0.5,
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "divider", borderRadius: 3 },
          }}
        >
          <CommunityPanel team={snapshot.team} role={role} memberCount={snapshot.memberCount} onlineCount={snapshot.onlineCount} />
        </Box>
      </Box>

      {/* Mobile info drawer */}
      <Drawer anchor="right" open={infoOpen} onClose={() => setInfoOpen(false)} sx={{ "& .MuiDrawer-paper": { width: { xs: "100%", sm: 380 }, p: 2.5, borderRadius: 0 } }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography sx={{ fontWeight: 650, fontSize: 17, letterSpacing: "-0.02em" }}>Community info</Typography>
          <IconButton onClick={() => setInfoOpen(false)} aria-label="Close">
            <KIcon icon="close" size={20} />
          </IconButton>
        </Box>
        <CommunityPanel team={snapshot.team} role={role} memberCount={snapshot.memberCount} onlineCount={snapshot.onlineCount} />
      </Drawer>

      {/* Report dialog */}
      <ReportDialog msg={reportMsg} onClose={() => setReportMsg(null)} onSubmit={handleReport} />

      {/* Sender profile (admin only) */}
      <UserProfileDialog userId={profileUserId} onClose={() => setProfileUserId(null)} />

      {/* Delete confirm */}
      <KDialog open={Boolean(deleteMsg)} onClose={() => setDeleteMsg(null)} title="Delete this message?" icon="delete" maxWidth="xs">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This removes the message from the room for everyone. It can&apos;t be undone.
        </Typography>
        <Box sx={{ mt: 2, px: 1.5, py: 1, borderRadius: 2, backgroundColor: color.canvasSunk, fontSize: 13, color: "text.secondary", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis" }}>
          “{deleteMsg?.message || "📎 Attachment"}”
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2.5 }}>
          <Button onClick={() => setDeleteMsg(null)} variant="outlined">
            Cancel
          </Button>
          <Button color="error" variant="contained" startIcon={<KIcon icon="delete" size={16} />} onClick={() => deleteMsg && handleDelete(deleteMsg)}>
            Delete
          </Button>
        </Box>
      </KDialog>

      {/* Moderation dialog */}
      <KDialog open={modOpen} onClose={() => setModOpen(false)} title="Reported messages" icon="flag" maxWidth="sm">
        {snapshot.reports.length === 0 ? (
          <KEmpty icon="verified" title="All clear" body="No open reports right now." compact />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {snapshot.reports.map((rep) => (
              <Box
                key={rep.id}
                sx={{
                  p: 1.75,
                  borderRadius: `${radius.card}px`,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="caption" sx={{ fontWeight: 650 }}>
                    {rep.senderName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    Reported by {rep.reporterName} · {CHAT_REPORT_REASONS.find((r) => r.value === rep.reason)?.label ?? rep.reason}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.75, overflow: "hidden", textOverflow: "ellipsis" }}>
                  “{rep.messageSnippet}”
                </Typography>
                {rep.note && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, fontStyle: "italic" }}>
                    {rep.note}
                  </Typography>
                )}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.25 }}>
                  <Button size="small" onClick={() => handleDismissReport(rep.id)} variant="outlined">
                    Dismiss
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="contained"
                    startIcon={<KIcon icon="delete" size={15} />}
                    onClick={async () => {
                      try {
                        await deleteChatMessage(rep.messageId)
                        const next = await getChatMessages()
                        setSnapshot(next)
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "Couldn't delete the message.")
                      }
                    }}
                  >
                    Delete message
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </KDialog>
    </Box>
  )
}

function ReportDialog({
  msg,
  onClose,
  onSubmit,
}: {
  msg: ChatMessageView | null
  onClose: () => void
  onSubmit: (reason: string, note: string) => void
}) {
  return (
    <KDialog open={Boolean(msg)} onClose={onClose} title="Report message" icon="flag" maxWidth="xs">
      {msg && (
        <ReportDialogBody key={msg.id} msg={msg} onClose={onClose} onSubmit={onSubmit} />
      )}
    </KDialog>
  )
}

function ReportDialogBody({
  msg,
  onClose,
  onSubmit,
}: {
  msg: ChatMessageView
  onClose: () => void
  onSubmit: (reason: string, note: string) => void
}) {
  const [reason, setReason] = useState(CHAT_REPORT_REASONS[0].value)
  const [note, setNote] = useState("")

  return (
    <>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
        Reporting this message by <strong>{msg.sender.name}</strong> sends it to the KIZ team for
        review. You can&apos;t report your own message.
      </Typography>
      <Box sx={{ mb: 2, px: 1.5, py: 1, borderRadius: 2, backgroundColor: color.canvasSunk, fontSize: 13, color: "text.secondary", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis" }}>
        “{msg.message || "📎 Attachment"}”
      </Box>
      <TextField
        select
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        slotProps={{ select: { renderValue: (v: unknown) => CHAT_REPORT_REASONS.find((r) => r.value === String(v))?.label ?? String(v) } }}
      >
        {CHAT_REPORT_REASONS.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Details (optional)"
        multiline
        minRows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything the team should know?"
        sx={{ mt: 2 }}
      />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2.5 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button color="error" variant="contained" startIcon={<KIcon icon="flag" size={16} />} onClick={() => onSubmit(reason, note)}>
          Submit report
        </Button>
      </Box>
    </>
  )
}

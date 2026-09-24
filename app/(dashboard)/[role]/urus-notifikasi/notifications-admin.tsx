"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Chip from "@mui/material/Chip"
import Alert from "@mui/material/Alert"
import Autocomplete from "@mui/material/Autocomplete"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow, Surface } from "@/components/kiz/primitives/list-group"
import { FormGrid } from "@/components/kiz/patterns/form-section"
import { color, radius } from "@/lib/theme"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import type { Role } from "@/lib/rbac"
import {
  AUDIENCE_META,
  CHANNEL_META,
  NOTIFICATION_CHANNELS,
  parseChannels,
  type NotificationAdminRow,
  type NotificationAudience,
  type NotificationChannel,
  type NotificationUserOption,
} from "@/lib/notification-meta"
import { sendNotificationAction, deleteNotificationAction } from "./actions"

const ROLES = Object.keys(ROLE_LABELS) as Role[]
const AUDIENCES: NotificationAudience[] = ["all", "role", "selected"]

interface Props {
  rows: NotificationAdminRow[]
  userOptions: NotificationUserOption[]
}

export function NotificationsAdmin({ rows, userOptions }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState("")
  const [channels, setChannels] = useState<NotificationChannel[]>(["in_app"])
  const [audience, setAudience] = useState<NotificationAudience>("all")
  const [audienceRole, setAudienceRole] = useState<Role>("ahli")
  const [selected, setSelected] = useState<NotificationUserOption[]>([])
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [deleting, setDeleting] = useState<NotificationAdminRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function toggleChannel(channel: NotificationChannel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  async function send() {
    setFeedback(null)
    if (!title.trim()) return setFeedback({ type: "error", message: "Give the notification a title." })
    if (!body.trim()) return setFeedback({ type: "error", message: "Write a message body." })
    if (channels.length === 0) return setFeedback({ type: "error", message: "Pick at least one channel." })
    if (audience === "selected" && selected.length === 0)
      return setFeedback({ type: "error", message: "Pick at least one person." })

    setSending(true)
    const res = await sendNotificationAction({
      title,
      body,
      link: link.trim() || null,
      audience,
      audienceRole: audience === "role" ? audienceRole : null,
      selectedUserIds: audience === "selected" ? selected.map((u) => u.id) : undefined,
      channels,
    })
    setSending(false)

    if (!res.success) {
      setFeedback({ type: "error", message: res.error })
      return
    }

    const { recipientCount, pushSentCount, emailSentCount, failedCount } = res.result
    setFeedback({
      type: "success",
      message:
        `Sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}` +
        ` · ${pushSentCount} push · ${emailSentCount} email` +
        (failedCount > 0 ? ` · ${failedCount} couldn't be delivered` : ""),
    })
    setTitle("")
    setBody("")
    setLink("")
    setSelected([])
    router.refresh()
  }

  async function confirmDelete() {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      await deleteNotificationAction(deleting.id)
      setDeleting(null)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Surface>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
          <KIcon icon="campaign" size={18} sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>New notification</Typography>
        </Box>

        <FormGrid columns={1} gap={2}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Water supply interruption"
            fullWidth
          />
          <TextField
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Water supply to Blocks K18A–K19D will be off tomorrow, 9 AM–1 PM."
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/ahli/pengumuman"
            helperText="Where tapping the notification should take them — an in-app path like /ahli/tempahan, or a full https:// link."
            fullWidth
          />
        </FormGrid>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            Channels
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {NOTIFICATION_CHANNELS.map((channel) => {
              const meta = CHANNEL_META[channel]
              const active = channels.includes(channel)
              return (
                <Chip
                  key={channel}
                  icon={<KIcon icon={meta.icon} size={16} />}
                  label={meta.label}
                  onClick={() => toggleChannel(channel)}
                  variant={active ? "filled" : "outlined"}
                  sx={{
                    borderRadius: `${radius.pill}px`,
                    backgroundColor: active ? color.brand[50] : undefined,
                    color: active ? color.brand[700] : undefined,
                    borderColor: active ? color.brand[300] : undefined,
                    fontWeight: 600,
                  }}
                />
              )
            })}
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75 }}>
            {channels.map((c) => CHANNEL_META[c].description).join(" ")}
          </Typography>
        </Box>

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            Audience
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {AUDIENCES.map((key) => {
              const meta = AUDIENCE_META[key]
              const active = audience === key
              return (
                <Chip
                  key={key}
                  icon={<KIcon icon={meta.icon} size={16} />}
                  label={meta.label}
                  onClick={() => setAudience(key)}
                  variant={active ? "filled" : "outlined"}
                  sx={{
                    borderRadius: `${radius.pill}px`,
                    backgroundColor: active ? color.brand[50] : undefined,
                    color: active ? color.brand[700] : undefined,
                    borderColor: active ? color.brand[300] : undefined,
                    fontWeight: 600,
                  }}
                />
              )
            })}
          </Box>

          {audience === "role" && (
            <TextField
              select
              label="Role"
              value={audienceRole}
              onChange={(e) => setAudienceRole(e.target.value as Role)}
              sx={{ mt: 2, maxWidth: 320 }}
              fullWidth
            >
              {ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </MenuItem>
              ))}
            </TextField>
          )}

          {audience === "selected" && (
            <Autocomplete
              multiple
              options={userOptions}
              value={selected}
              onChange={(_, value) => setSelected(value)}
              getOptionLabel={(option) => `${option.name} · ${option.matricId}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterSelectedOptions
              sx={{ mt: 2 }}
              renderInput={(params) => (
                <TextField {...params} label="People" placeholder="Search by name or matric no." />
              )}
            />
          )}
        </Box>

        {feedback && (
          <Alert severity={feedback.type} sx={{ mt: 2.5, borderRadius: `${radius.input}px` }}>
            {feedback.message}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
          <Button
            variant="contained"
            onClick={send}
            loading={sending}
            startIcon={<KIcon icon="send" size={17} />}
          >
            Send notification
          </Button>
        </Box>
      </Surface>

      {rows.length === 0 ? (
        <KEmpty
          icon="notifications_none"
          title="No notifications sent yet"
          body="Sent notifications and their delivery counts will show up here."
        />
      ) : (
        <ListGroup title={`Sent · ${rows.length}`}>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              icon="notifications"
              title={row.title}
              subtitle={row.body}
              meta={row.createdAt}
              trailing={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {parseChannels(row.channels).map((channel) => (
                    <Chip
                      key={channel}
                      size="small"
                      label={CHANNEL_META[channel].label}
                      sx={{ borderRadius: `${radius.pill}px`, height: 22, fontSize: 11 }}
                    />
                  ))}
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    {row.recipientCount} {row.recipientCount === 1 ? "person" : "people"}
                    {row.failedCount > 0 ? ` · ${row.failedCount} failed` : ""}
                  </Typography>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      aria-label={`Delete ${row.title}`}
                      disabled={busyId === row.id}
                      onClick={() => setDeleting(row)}
                    >
                      <KIcon icon="delete" size={17} />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          ))}
        </ListGroup>
      )}

      <KDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this notification?"
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
          &ldquo;{deleting?.title}&rdquo; will be removed from the history and from everyone&apos;s in-app
          notifications. Messages already pushed or emailed can&apos;t be recalled.
        </Typography>
      </KDialog>
    </Box>
  )
}

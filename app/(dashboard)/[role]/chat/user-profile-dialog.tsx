"use client"

import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import CircularProgress from "@mui/material/CircularProgress"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { MessageAvatar } from "./message-row"
import { getChatUserProfile } from "./actions"
import { chatRoleBadge } from "@/lib/chat-meta"
import { formatMalaysiaDate } from "@/lib/timezone"
import { color, radius } from "@/lib/theme"
import type { ChatUserProfileView } from "./chat-types"

/**
 * Admin-only profile peek opened from a chat sender's name/avatar. Fetches
 * lazily on open; the role gate lives in the server action, so this dialog is
 * purely presentational.
 */
export function UserProfileDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  return (
    <KDialog open={Boolean(userId)} onClose={onClose} title="Sender profile" icon="person" maxWidth="xs">
      {userId && <ProfileLoader key={userId} userId={userId} />}
    </KDialog>
  )
}

function ProfileLoader({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ChatUserProfileView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getChatUserProfile(userId)
      .then((p) => {
        if (alive) setProfile(p)
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "Couldn't load this profile.")
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [userId])

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    )
  }

  if (error || !profile) {
    return <KEmpty icon="error" title="Couldn't load profile" body={error ?? "User not found."} compact />
  }

  return <ProfileBody profile={profile} />
}

function ProfileBody({ profile }: { profile: ChatUserProfileView }) {
  const badge = chatRoleBadge(profile.role)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <MessageAvatar name={profile.name} url={profile.avatarUrl} size={48} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 650, fontSize: 16, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 0.5 }}>
            <Box
              component="span"
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                lineHeight: 1,
                px: 0.9,
                py: 0.5,
                borderRadius: `${radius.pill}px`,
                backgroundColor: badge.tone.soft,
                color: badge.tone.ink,
              }}
            >
              {badge.label}
            </Box>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: 11, fontWeight: 600, color: profile.online ? color.success.ink : "text.disabled" }}>
              <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: profile.online ? color.success.main : "text.disabled" }} />
              {profile.online ? "Online" : "Offline"}
            </Box>
          </Box>
        </Box>
      </Box>

      <ListGroup>
        <ListRow icon="badge" title="Matric ID" meta={profile.matricId} />
        {profile.email && <ListRow icon="mail" title="Email" meta={profile.email} />}
        {profile.phone && <ListRow icon="phone" title="Phone" meta={profile.phone} />}
        {profile.roomLabel && <ListRow icon="meeting_room" title="Room" meta={profile.roomLabel} />}
        <ListRow
          icon="verified"
          title="Account status"
          trailing={<StatusChip status={profile.accountStatus} />}
        />
        <ListRow icon="calendar_month" title="Member since" meta={formatMalaysiaDate(new Date(profile.createdAt))} />
      </ListGroup>
    </Box>
  )
}

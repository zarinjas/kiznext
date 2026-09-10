"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { ListGroup, Surface } from "@/components/kiz/primitives/list-group"
import { MessageAvatar } from "./message-row"
import { KIcon } from "@/components/kiz/primitives/icon"
import { COMMUNITY_GUIDELINES } from "@/lib/chat-meta"
import { chatRoleBadge } from "@/lib/chat-meta"
import { color, radius } from "@/lib/theme"
import type { ChatTeamMemberView } from "./chat-types"

/**
 * Right-side community info rail: the pinned-at-the-top guidelines, the
 * Community Team (office + fellows), and a clear path to Helpdesk for official
 * matters or damage complaints. Rendered both as the desktop rail and inside
 * the mobile info drawer.
 */

export function GuidelinesBlock() {
  return (
    <ListGroup title="Community Guidelines" variant="plain">
      <Surface padded={false}>
        {COMMUNITY_GUIDELINES.map((g, i) => (
          <Box
            key={g.title}
            sx={{
              display: "flex",
              gap: 1.5,
              px: { xs: 2, sm: 2.25 },
              py: 1.5,
              minWidth: 0,
              ...(i > 0 && { borderTop: "1px solid", borderColor: "divider" }),
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: `${radius.input}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: color.brand[50],
                color: color.brand[700],
                mt: 0.25,
              }}
            >
              <KIcon icon={g.icon} size={18} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 620, fontSize: 13.5, letterSpacing: "-0.011em" }}>
                {g.title}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.375, lineHeight: 1.5 }}>
                {g.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Surface>
    </ListGroup>
  )
}

export function CommunityPanel({
  team,
  role,
  memberCount,
  onlineCount,
}: {
  team: ChatTeamMemberView[]
  role: string
  memberCount: number
  onlineCount: number
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Community Team */}
      <ListGroup
        variant="plain"
        title="Community Team"
        action={
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: color.success.main, fontSize: 12, fontWeight: 600 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: color.success.main }} />
            {onlineCount} online
          </Box>
        }
      >
        <Surface padded={false}>
          {team.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", px: 2, py: 2 }}>
              No team members yet.
            </Typography>
          ) : (
            team.map((m) => {
              const badge = chatRoleBadge(m.role)
              return (
                <Box
                  key={m.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: { xs: 2, sm: 2.25 },
                    py: 1.25,
                    minWidth: 0,
                  }}
                >
                  <Box sx={{ position: "relative", flexShrink: 0 }}>
                    <MessageAvatar name={m.name} url={m.avatarUrl} size={36} />
                    <Box
                      sx={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor: "background.paper",
                        backgroundColor: m.online ? color.success.main : color.ink[300],
                      }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 13.5,
                        letterSpacing: "-0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.name}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.375,
                      borderRadius: `${radius.pill}px`,
                      backgroundColor: badge.tone.soft,
                      color: badge.tone.ink,
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </Box>
                </Box>
              )
            })
          )}
        </Surface>
        {memberCount > 0 && (
          <Typography variant="caption" sx={{ color: "text.disabled", mt: 0.5, display: "block", px: 0.5 }}>
            {memberCount} members in the community room
          </Typography>
        )}
      </ListGroup>

      {/* Official matters → Helpdesk */}
      <Surface>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: `${radius.input}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: color.info.soft,
              color: color.info.ink,
            }}
          >
            <KIcon icon="support_agent" size={20} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 640, fontSize: 14, letterSpacing: "-0.012em" }}>
              Official matters?
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.375, lineHeight: 1.55 }}>
              Complaints, damage reports and requests that need the KIZ office go through
              Helpdesk — not the chat.
            </Typography>
            <Box
              component={Link}
              href={`/${role}/helpdesk`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                mt: 1.25,
                fontSize: 13,
                fontWeight: 700,
                color: color.info.ink,
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Open Helpdesk
              <KIcon icon="arrow_forward" size={15} />
            </Box>
          </Box>
        </Box>
      </Surface>

      {/* Guidelines live on the page for context; full list is in the rail. */}
      <GuidelinesBlock />
    </Box>
  )
}

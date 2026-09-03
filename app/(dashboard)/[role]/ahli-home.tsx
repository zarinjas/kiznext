"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { Bento, BentoItem, ActionTile } from "@/components/kiz/patterns/bento"
import { AvatarPicker } from "@/components/shared/avatar-picker"
import { gradient, font, radius, color } from "@/lib/theme"
import { formatMalaysia } from "@/lib/timezone"
import type { BilikReminder } from "@/lib/bilik"

interface Props {
  user: {
    name: string
    matricId: string
    block: string | null
    roomNumber: string | null
    avatarUrl: string | null
  }
  announcements: {
    id: string
    title: string
    tag: string
    isPinned: boolean
    attachmentType: string | null
    createdAt: Date
  }[]
  bookings: {
    id: string
    status: string
    timeSlotStart: Date
    facility: { name: string }
  }[]
  role: string
  /** Hero badge label — "Resident" for students, "Staff" for staff accounts. */
  memberTag?: string
  roomReminder: BilikReminder | null
  /** Computed on the server so SSR and hydration always agree. */
  greeting: string
}

const quickActions = [
  { label: "Book facility", href: "tempahan-fasiliti", icon: "meeting_room", tint: color.info },
  { label: "Guest house", href: "rumah-tamu", icon: "hotel", tint: { main: color.accent[600], soft: color.accent[100], ink: color.accent[700] } },
  { label: "Helpdesk", href: "helpdesk", icon: "support_agent", tint: color.warning },
  { label: "Lost & found", href: "hilang", icon: "search", tint: color.danger },
  { label: "Offices", href: "pejabat", icon: "domain", tint: color.info },
  { label: "AR Directory", href: "direktori", icon: "view_in_ar", tint: { main: color.brand[600], soft: color.brand[50], ink: color.brand[800] } },
  { label: "My bookings", href: "tempahan", icon: "calendar_month", tint: color.neutral },
]

const shortDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-MY", { day: "numeric", month: "short" })

export function AhliHome({ user, announcements, bookings, role, memberTag, roomReminder, greeting }: Props) {
  const firstName = user.name.trim().split(" ")[0]

  const upcoming = bookings.filter((b) => b.status !== "rejected" && b.status !== "cancelled")
  const location = [user.block, user.roomNumber].filter(Boolean)

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Bento>
        {/* Room-selection reminder */}
        {roomReminder?.show && (
          <BentoItem span={12} delay={0}>
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
                p: { xs: 2, sm: 2.5 },
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: color.accent[300],
                backgroundImage: gradient.panel,
                "[data-mui-color-scheme='dark'] &": { backgroundImage: "none", backgroundColor: "background.paper" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    backgroundColor: color.accent[100],
                    color: color.accent[700],
                  }}
                >
                  <KIcon icon="bedroom_parent" size={24} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 640, letterSpacing: "-0.02em", fontSize: { xs: 15, sm: 17 } }}>
                    Complete your accommodation application
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                    Room selection is open{roomReminder.closesAt ? ` — closes ${formatMalaysia(new Date(roomReminder.closesAt))}` : ""}. Choose your bed before it closes.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  component={Link}
                  href={`/${role}/bilik`}
                  variant="contained"
                  startIcon={<KIcon icon="arrow_forward" size={17} />}
                >
                  Choose room
                </Button>
              </Box>
            </Box>
          </BentoItem>
        )}

        {/* Hero + avatar */}
        <BentoItem span={8} spanXs={2}>
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              height: "100%",
              borderRadius: `${radius.cardLg}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundImage: gradient.hero,
              "[data-mui-color-scheme='dark'] &": {
                backgroundImage: "none",
                backgroundColor: "background.paper",
              },
              p: { xs: 2.5, sm: 3.5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 3,
              minHeight: { xs: 0, md: 210 },
            }}
          >
            <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />

            <Box sx={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.625, px: 1, py: 0.375, borderRadius: 999, backgroundColor: color.accent[100], color: color.accent[700], fontSize: 11, fontWeight: 600 }}>
                  <KIcon icon={memberTag === "Staff" ? "work" : "verified_user"} size={13} />
                  {memberTag ?? "Resident"}
                </Box>
                <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
                  {greeting}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 26, sm: 30 },
                    fontWeight: 640,
                    lineHeight: 1.14,
                    letterSpacing: "-0.032em",
                    mt: 0.25,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {firstName}
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, color: "text.secondary", fontFamily: font.mono, mt: 1 }}
                >
                  {user.matricId}
                  {location.length > 0 && ` · ${location.join(" • ")}`}
                </Typography>
              </Box>

              <AvatarPicker avatarUrl={user.avatarUrl} name={user.name} size={72} />
            </Box>

            <Box sx={{ position: "relative", display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                component={Link}
                href={`/${role}/kad-maya`}
                variant="contained"
                startIcon={<KIcon icon="qr_code_2" size={18} />}
              >
                Show eCard
              </Button>
              <Button
                component={Link}
                href={`/${role}/tempahan-fasiliti`}
                variant="outlined"
                startIcon={<KIcon icon="add" size={18} />}
              >
                Book
              </Button>
            </Box>
          </Box>
        </BentoItem>

        {/* Upcoming bookings */}
        <BentoItem span={4} spanXs={2} delay={0.05}>
          <Box
            sx={{
              height: "100%",
              borderRadius: `${radius.cardLg}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              p: { xs: 2, sm: 2.5 },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Your bookings
              </Typography>
              <Button
                component={Link}
                href={`/${role}/tempahan`}
                size="small"
                variant="text"
                sx={{ minHeight: 26, px: 0.75 }}
              >
                All
              </Button>
            </Box>

            {upcoming.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                  py: 3,
                }}
              >
                <KIcon icon="calendar_month" size={22} sx={{ color: "var(--mui-palette-text-disabled)" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center" }}>
                  No bookings yet
                </Typography>
                <Button component={Link} href={`/${role}/tempahan-fasiliti`} size="small" variant="outlined">
                  Book a facility
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {upcoming.slice(0, 3).map((b) => (
                  <Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 550,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.facility.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled" }}>
                        {shortDate(b.timeSlotStart)}
                      </Typography>
                    </Box>
                    <StatusChip status={b.status} />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </BentoItem>

        {/* Quick actions */}
        <BentoItem span={12} sx={{ mt: { xs: 1, md: 1.5 } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
            Quick actions
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(3, minmax(0,1fr))",
                sm: "repeat(3, minmax(0,1fr))",
                md: "repeat(auto-fit, minmax(120px, 1fr))",
              },
              gap: { xs: 1.25, sm: 1.5, md: 2 },
            }}
          >
            {quickActions.map((a) => (
              <ActionTile key={a.href} {...a} href={`/${role}/${a.href}`} />
            ))}
          </Box>
        </BentoItem>

        {/* Announcements */}
        <BentoItem span={12} sx={{ mt: { xs: 1, md: 1.5 } }}>
          <ListGroup
            title="Latest announcements"
            action={
              <Button
                component={Link}
                href={`/${role}/pengumuman`}
                size="small"
                variant="text"
                sx={{ minHeight: 26, px: 0.75 }}
              >
                View all
              </Button>
            }
          >
            {announcements.length === 0 ? (
              <ListRow>
                <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
                  No announcements yet.
                </Typography>
              </ListRow>
            ) : (
              announcements.map((a) => (
                <ListRow
                  key={a.id}
                  href={`/${role}/pengumuman`}
                  icon={a.isPinned ? "push_pin" : "campaign"}
                  title={a.title}
                  subtitle={
                    <Box component="span" sx={{ textTransform: "capitalize" }}>
                      {a.tag} · {shortDate(a.createdAt)}
                    </Box>
                  }
                  trailing={
                    a.attachmentType ? (
                      <KIcon
                        icon="attach_file"
                        size={16}
                        sx={{ color: "var(--mui-palette-text-disabled)" }}
                      />
                    ) : undefined
                  }
                />
              ))
            )}
          </ListGroup>
        </BentoItem>
      </Bento>
    </Box>
  )
}

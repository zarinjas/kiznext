"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import LinearProgress from "@mui/material/LinearProgress"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Bento, BentoItem } from "@/components/kiz/patterns/bento"
import { AvatarPicker } from "@/components/shared/avatar-picker"
import { HomeWidgets } from "@/components/shared/home/home-widgets"
import { StayConnected } from "@/components/shared/home/stay-connected"
import { color, font, radius, gradient } from "@/lib/theme"
import { announcementTagMeta } from "@/lib/announcement-meta"
import type { HomeTodo, PinnedAnnouncementView, ResidentHomeData } from "@/lib/dashboard"

/**
 * Member home (students + staff) — the resident-style dashboard.
 *
 * Layout mirrors the approved product mock:
 *   1. gradient hero with full room placement (Block · Room · Bed + session)
 *      and the roommate once allocations are published;
 *   2. a "Things to Do" checklist with a progress bar that flips to a
 *      celebratory "You're all caught up" state when nothing is pending;
 *   3. the small living-at-KIZ widgets row (Important Notice, Upcoming at KIZ,
 *      My Helpdesk Request, Emergency Contact, Life at KIZ).
 *
 * Quick actions / your bookings / latest announcements intentionally moved off
 * the dashboard — they stay reachable from the navigation.
 */

interface Props {
  role: "ahli" | "staf" | "fellow"
  user: { name: string; matricId: string; avatarUrl: string | null }
  memberTag: string
  greeting: string
  data: ResidentHomeData
  /** Optional full-width banner image behind the hero (fallback = gradient). */
  heroBackgroundUrl: string | null
  /** Optional portrait poster (Instagram-style) shown beside Things to Do. */
  posterUrl: string | null
}

export function AhliHome({ role, user, memberTag, greeting, data, heroBackgroundUrl, posterUrl }: Props) {
  const fullName = user.name.trim()

  const pending = data.todos.filter((t) => !t.done)
  const allCaughtUp = data.todos.length > 0 && pending.length === 0

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Bento>
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <BentoItem span={12} spanXs={2}>
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              height: "100%",
              minHeight: { xs: 240, sm: 300 },
              borderRadius: `${radius.cardLg}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundImage: heroBackgroundUrl ? "none" : gradient.hero,
              p: { xs: 2.5, sm: 3.5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 3,
            }}
          >
            {heroBackgroundUrl ? (
              <Box
                component="img"
                src={heroBackgroundUrl}
                alt=""
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: { xs: "right bottom", sm: "center" },
                  pointerEvents: "none",
                }}
              />
            ) : (
              <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />
            )}

            {/* Legibility scrim over the custom banner image */}
            {heroBackgroundUrl && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(100deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.72) 40%, rgba(255,255,255,0.10) 100%)",
                  pointerEvents: "none",
                }}
              />
            )}

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
                    fontSize: { xs: 24, sm: 28 },
                    fontWeight: 640,
                    lineHeight: 1.2,
                    letterSpacing: "-0.032em",
                    mt: 0.25,
                    overflowWrap: "anywhere",
                  }}
                >
                  {fullName}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", fontFamily: font.mono, mt: 1 }}>
                  {user.matricId}
                </Typography>
              </Box>

              <AvatarPicker avatarUrl={user.avatarUrl} name={user.name} size={72} />
            </Box>

            {/* Full room placement */}
            {data.room ? (
              <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.625,
                      px: 1.25,
                      py: 0.625,
                      borderRadius: 999,
                      backgroundColor: color.brand[600],
                      color: "#fff",
                      fontSize: 13.5,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    <KIcon icon="meeting_room" size={16} />
                    Block {data.room.blockName} · Room {data.room.roomNumber}
                    {data.room.bed ? ` · Bed ${data.room.bed}` : ""}
                  </Box>
                  {data.room.session && (
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.5, borderRadius: 999, backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", fontSize: 11.5, fontWeight: 550, color: "text.secondary" }}>
                      <KIcon icon="calendar_month" size={14} />
                      {data.room.session}
                    </Box>
                  )}
                  {data.checkInStatus && (
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.5,
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: 700,
                        ...(data.checkInStatus === "checked_in"
                          ? { backgroundColor: color.success.soft, color: color.success.ink }
                          : data.checkInStatus === "checked_out"
                            ? { backgroundColor: color.info.soft, color: color.info.ink }
                            : { backgroundColor: "background.paper", border: "1px solid", borderColor: "divider", color: "text.secondary" }),
                      }}
                    >
                      <KIcon
                        icon={data.checkInStatus === "checked_in" ? "login" : data.checkInStatus === "checked_out" ? "logout" : "pending"}
                        size={14}
                      />
                      {data.checkInStatus === "checked_in" ? "Checked in" : data.checkInStatus === "checked_out" ? "Checked out" : "Not checked in yet"}
                    </Box>
                  )}
                </Box>
                {data.room.roommateName && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    <KIcon icon="group" size={14} />
                    Roommate · {data.room.roommateName}
                    {data.room.roommateMatricId ? ` (${data.room.roommateMatricId})` : ""}
                  </Typography>
                )}
              </Box>
            ) : (
              role === "ahli" && (
                <Box sx={{ position: "relative" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    <KIcon icon="hourglass_top" size={14} />
                    Your room will appear here once the KIZ office publishes the allocation.
                  </Typography>
                </Box>
              )
            )}

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
                Book facility
              </Button>
            </Box>
          </Box>
        </BentoItem>

        {/* ── Pinned announcements ────────────────────────────────────────── */}
        {data.pinnedAnnouncements.length > 0 && (
          <BentoItem span={12} spanXs={2} delay={0.03}>
            <Box>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mb: 1.25 }}>
                <KIcon icon="push_pin" size={18} filled sx={{ color: color.brand[600] }} />
                <Typography sx={{ fontWeight: 640, letterSpacing: "-0.018em", fontSize: { xs: 15.5, sm: 17 } }}>
                  Pinned announcements
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gap: 1.5 }}>
                {data.pinnedAnnouncements.map((a) => (
                  <PinnedAnnouncementCard key={a.id} announcement={a} role={role} />
                ))}
              </Box>
            </Box>
          </BentoItem>
        )}

        {/* ── Things to Do ────────────────────────────────────────────────── */}
        <BentoItem span={posterUrl ? 8 : 12} spanXs={2} delay={0.05}>
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
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1.25 }}>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                <KIcon icon="task_alt" size={18} sx={{ color: color.brand[600] }} />
                <Typography sx={{ fontWeight: 640, letterSpacing: "-0.018em", fontSize: { xs: 15.5, sm: 17 } }}>
                  Things to do
                </Typography>
              </Box>
              {data.todos.length > 0 && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 1,
                    py: 0.375,
                    borderRadius: 999,
                    backgroundColor: allCaughtUp ? color.success.soft : color.warning.soft,
                    color: allCaughtUp ? color.success.ink : color.warning.ink,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {data.doneCount} of {data.todos.length} done
                </Box>
              )}
            </Box>

            {data.todos.length > 0 && (
              <LinearProgress
                variant="determinate"
                value={data.todos.length ? (data.doneCount / data.todos.length) * 100 : 0}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  mb: 1.5,
                  backgroundColor: color.canvasSunk,
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    backgroundColor: allCaughtUp ? color.success.main : color.brand[600],
                  },
                }}
              />
            )}

            {data.todos.length === 0 || allCaughtUp ? (
              <CaughtUpPanel hasTasks={data.todos.length > 0} />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                {data.todos.map((todo) => (
                  <TodoRow key={todo.id} todo={todo} />
                ))}
              </Box>
            )}
          </Box>
        </BentoItem>

        {/* ── Poster card ─────────────────────────────────────────────────── */}
        {posterUrl && (
          <BentoItem span={4} spanXs={2} delay={0.1}>
            <Box
              component="a"
              href={posterUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open poster"
              sx={{
                position: "relative",
                display: "block",
                overflow: "hidden",
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                cursor: "zoom-in",
                WebkitTapHighlightColor: "transparent",
                "&:active": { opacity: 0.92 },
              }}
            >
              <Box
                component="img"
                src={posterUrl}
                alt="College poster"
                sx={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "4 / 5",
                  objectFit: "cover",
                  objectPosition: "top center",
                  transition: "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                  "@media (hover: hover)": { "&:hover": { transform: "scale(1.02)" } },
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: "rgba(9,9,11,0.55)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                  pointerEvents: "none",
                }}
              >
                <KIcon icon="open_in_new" size={16} />
              </Box>
            </Box>
          </BentoItem>
        )}

        {/* ── Stay Connected ──────────────────────────────────────────────── */}
        {data.stayConnected.enabled && data.stayConnected.links.length > 0 && (
          <BentoItem span={12} spanXs={2} delay={0.1}>
            <StayConnected section={data.stayConnected} />
          </BentoItem>
        )}

        {/* ── Widgets row ─────────────────────────────────────────────────── */}
        {(data.importantNotice ||
          data.nextEvents.length > 0 ||
          data.helpdesk ||
          data.officeOpen ||
          data.emergencyContacts.length > 0 ||
          data.livingGuides.length > 0) && (
          <BentoItem span={12} spanXs={2} delay={0.1}>
            <HomeWidgets
              role={role}
              importantNotice={data.importantNotice}
              nextEvents={data.nextEvents}
              helpdesk={data.helpdesk}
              officeOpen={data.officeOpen}
              emergencyContacts={data.emergencyContacts}
              livingGuides={data.livingGuides}
            />
          </BentoItem>
        )}
      </Bento>
    </Box>
  )
}

function PinnedAnnouncementCard({
  announcement: a,
  role,
}: {
  announcement: PinnedAnnouncementView
  role: "ahli" | "staf" | "fellow"
}) {
  const meta = announcementTagMeta(a.tag)
  const hasImage = a.attachmentType === "image" && Boolean(a.attachmentUrl)

  return (
    <Box
      component={Link}
      href={`/${role}/pengumuman`}
      sx={{
        display: "flex",
        flexDirection: { xs: hasImage ? "column" : "row", sm: "row" },
        alignItems: "stretch",
        overflow: "hidden",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        textDecoration: "none",
        color: "inherit",
        WebkitTapHighlightColor: "transparent",
        transition: "border-color 160ms ease, transform 160ms ease",
        "@media (hover: hover)": {
          "&:hover": { borderColor: color.brand[300], transform: "translateY(-1px)" },
        },
        "&:active": { opacity: 0.94 },
      }}
    >
      {hasImage && (
        <Box
          component="img"
          src={a.attachmentUrl!}
          alt=""
          sx={{
            display: "block",
            width: { xs: "100%", sm: 220 },
            height: { xs: 180, sm: "auto" },
            minHeight: { sm: 150 },
            objectFit: "cover",
            flexShrink: 0,
            borderRight: { xs: 0, sm: "1px solid" },
            borderBottom: { xs: "1px solid", sm: 0 },
            borderColor: "divider",
          }}
        />
      )}

      <Box
        sx={{
          minWidth: 0,
          flex: 1,
          p: { xs: 2, sm: 2.25 },
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          justifyContent: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.375,
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
            <KIcon icon={meta.icon} size={12} />
            {meta.label}
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            {a.when}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontWeight: 640,
            fontSize: { xs: 15.5, sm: 17 },
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {a.title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            lineHeight: 1.55,
            fontSize: 13.5,
            display: "-webkit-box",
            WebkitLineClamp: hasImage ? 2 : 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {a.content}
        </Typography>
      </Box>
    </Box>
  )
}

function CaughtUpPanel({ hasTasks }: { hasTasks: boolean }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 1,
        px: 2,
        py: 4,
        borderRadius: `${radius.card}px`,
        backgroundColor: color.success.soft,
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          backgroundColor: color.success.main,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 0.5,
        }}
      >
        <KIcon icon="check" size={26} />
      </Box>
      <Typography sx={{ fontWeight: 650, color: color.success.ink, letterSpacing: "-0.015em" }}>
        {hasTasks ? "You're all caught up" : "Nothing to do yet"}
      </Typography>
      <Typography variant="body2" sx={{ color: color.success.ink, opacity: 0.8, maxWidth: 240 }}>
        {hasTasks
          ? "No action is required at the moment."
          : "Check back soon — your onboarding tasks will appear here."}
      </Typography>
    </Box>
  )
}

function TodoRow({
  todo,
}: {
  todo: HomeTodo
}) {
  const statusColor = todo.done ? color.success : color.neutral
  const leading = todo.done ? "check_circle" : "check_box_outline_blank"
  const showDue = !todo.done && Boolean(todo.dueLabel)

  const cta = (
    <Button
      component={Link}
      href={todo.href}
      size="small"
      variant={todo.done ? "outlined" : "contained"}
      sx={{ minWidth: 0, whiteSpace: "nowrap", minHeight: 30 }}
    >
      {todo.ctaLabel}
    </Button>
  )

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        py: { xs: 1.25, sm: 1.5 },
        minHeight: { xs: 48, sm: 52 },
        "& + &": { borderTop: "1px solid", borderColor: "divider" },
      }}
    >
      <KIcon
        icon={leading}
        size={22}
        filled={todo.done}
        sx={{ color: statusColor.main, flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            fontSize: 13.5,
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            ...(todo.done && { color: "text.secondary" }),
          }}
        >
          {todo.title}
        </Typography>
        {todo.subtitle && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {todo.subtitle}
          </Typography>
        )}
        {showDue && (
          <Typography
            variant="caption"
            sx={{ color: color.warning.ink, display: "block", fontWeight: 600, mt: 0.25 }}
          >
            <KIcon icon="schedule" size={12} sx={{ verticalAlign: -2, marginRight: 0.25 }} />
            {todo.dueLabel}
          </Typography>
        )}
      </Box>
      {cta}
    </Box>
  )
}

"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Bento, BentoItem, MetricTile, ActionTile, HeroTile } from "@/components/kiz/patterns/bento"

interface Props {
  /** Retained for the server page's call signature; the bento derives its own copy. */
  title?: string
  description?: string
  userName: string
  role: string
  stats: {
    pendingFacility: number
    pendingGuestHouse: number
    openTickets: number
    activeLostFound: number
  }
}

export function AdminHome({ userName, role, stats }: Props) {
  const canManage = role === "admin_kiz" || role === "superadmin"
  const isPengetua = role === "pengetua"

  const totalPending = stats.pendingFacility + stats.pendingGuestHouse
  const firstName = userName.trim().split(" ")[0] || "there"

  const metrics = [
    { label: "Pending bookings", value: stats.pendingFacility, href: "urus-tempahan-fasiliti", icon: "task_alt", emphasis: true },
    { label: "Guest house", value: stats.pendingGuestHouse, href: "urus-rumah-tamu", icon: "hotel", emphasis: true },
    { label: "Open tickets", value: stats.openTickets, href: "urus-helpdesk", icon: "inbox" },
    { label: "Lost & found", value: stats.activeLostFound, href: "hilang", icon: "search" },
  ]

  const visibleMetrics = canManage ? metrics : metrics.filter((m) => m.href === "hilang")

  const actions = [
    canManage && { label: "Publish announcement", href: "urus-pengumuman", icon: "campaign" },
    canManage && { label: "Helpdesk inbox", href: "urus-helpdesk", icon: "inbox" },
    canManage && { label: "Facilities", href: "urus-fasiliti", icon: "apartment" },
    canManage && { label: "Settings", href: "urus-tetapan", icon: "settings" },
    { label: "Announcements", href: "pengumuman", icon: "campaign" },
    { label: "Community chat", href: "chat", icon: "forum" },
  ].filter(Boolean) as { label: string; href: string; icon: string }[]

  const allClear = canManage && totalPending === 0

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Bento>
        {/* Hero — the attention surface */}
        <BentoItem span={canManage ? 8 : 12}>
          {allClear ? (
            <HeroTile
              eyebrow="All clear"
              title={`Good to go, ${firstName}`}
              body="No bookings are waiting on you right now."
              action={
                <Button
                  component={Link}
                  href={`/${role}/urus-tempahan-fasiliti`}
                  variant="outlined"
                  endIcon={<KIcon icon="arrow_forward" size={17} />}
                >
                  View all bookings
                </Button>
              }
            />
          ) : canManage ? (
            <HeroTile
              tone="alert"
              eyebrow="Needs your attention"
              title={
                <>
                  You have {totalPending} booking{totalPending === 1 ? "" : "s"} pending your approval
                </>
              }
              body={`Hi ${firstName} — review them to keep residents moving.`}
              action={
                <Button
                  component={Link}
                  href={`/${role}/urus-tempahan-fasiliti`}
                  variant="contained"
                  endIcon={<KIcon icon="arrow_forward" size={17} />}
                >
                  Review now
                </Button>
              }
            />
          ) : (
            <HeroTile
              eyebrow={isPengetua ? "Principal · read only" : undefined}
              title={`Welcome, ${firstName}`}
              body="A read-only overview of college operations."
            />
          )}
        </BentoItem>

        {/* Metrics — 2×2 beside the hero on desktop, 2-up on mobile */}
        {canManage ? (
          <BentoItem span={4} spanXs={2}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: { xs: 1.25, sm: 1.5, md: 2 },
                height: "100%",
              }}
            >
              {visibleMetrics.map((m) => (
                <MetricTile key={m.href} {...m} href={`/${role}/${m.href}`} />
              ))}
            </Box>
          </BentoItem>
        ) : (
          visibleMetrics.map((m, i) => (
            <BentoItem key={m.href} span={3} delay={0.04 * i}>
              <MetricTile {...m} href={`/${role}/${m.href}`} />
            </BentoItem>
          ))
        )}

        {/* Quick actions */}
        <BentoItem span={12} sx={{ mt: { xs: 1, md: 1.5 } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1.5 }}>
            Quick actions
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0,1fr))",
                sm: "repeat(3, minmax(0,1fr))",
                md: "repeat(6, minmax(0,1fr))",
              },
              gap: { xs: 1.25, sm: 1.5, md: 2 },
            }}
          >
            {actions.map((a) => (
              <ActionTile key={a.href} {...a} href={`/${role}/${a.href}`} />
            ))}
          </Box>
        </BentoItem>
      </Bento>
    </Box>
  )
}

"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KCard } from "@/components/kiz/primitives/k-card"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { color, elevation } from "@/lib/theme"
import { formatMalaysia, nowMalaysia } from "@/lib/timezone"

interface Props {
  user: {
    name: string
    matricId: string
    block: string | null
    roomNumber: string | null
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
}

const quickActions = [
  { label: "Book Facility", href: "tempahan-fasiliti", icon: "meeting_room", tone: "brand" },
  { label: "Guest House", href: "rumah-tamu", icon: "hotel", tone: "info" },
  { label: "Helpdesk", href: "helpdesk", icon: "support_agent", tone: "warning" },
  { label: "Parcel", href: "parcel", icon: "inventory_2", tone: "success" },
  { label: "Lost & Found", href: "hilang", icon: "search", tone: "danger" },
  { label: "Directory", href: "direktori", icon: "map", tone: "info" },
] as const

const toneMap: Record<string, { bg: string; fg: string }> = {
  brand: { bg: color.brand[50], fg: color.brand[700] },
  success: { bg: color.success.soft, fg: color.success.ink },
  warning: { bg: color.warning.soft, fg: color.warning.ink },
  danger: { bg: color.danger.soft, fg: color.danger.ink },
  info: { bg: color.info.soft, fg: color.info.ink },
}

const firstName = (name: string) => name.trim().split(" ")[0]

export function AhliHome({ user, announcements, bookings, role }: Props) {
  const now = nowMalaysia()
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              {formatMalaysia(now)}
            </Typography>
            <Typography variant="h1" sx={{ fontFamily: "var(--font-fraunces), serif" }}>
              {greeting}, {firstName(user.name)}
            </Typography>
          </Box>
          <Button
            component={Link}
            href={`/${role}/kad-maya`}
            variant="outlined"
            startIcon={<KIcon icon="qr_code_2" size={18} />}
          >
            Show eCard
          </Button>
        </Box>
      </motion.div>

      {/* Quick actions */}
      <Grid container spacing={1.5}>
        {quickActions.map((a, i) => {
          const t = toneMap[a.tone]
          return (
            <Grid key={a.href} size={{ xs: 6, sm: 4, lg: 2 }}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
                <Link href={`/${role}/${a.href}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      p: 2,
                      borderRadius: 2.5,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "background.paper",
                      boxShadow: elevation.e1,
                      "&:hover": { boxShadow: elevation.e2 },
                    }}
                  >
                    <Box sx={{ width: 44, height: 44, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: t.bg, color: t.fg }}>
                      <KIcon icon={a.icon} size={22} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: "center" }}>
                      {a.label}
                    </Typography>
                  </Box>
                </Link>
              </motion.div>
            </Grid>
          )
        })}
      </Grid>

      {/* eCard strip */}
      <Box
        sx={{
          mt: 2.5,
          borderRadius: 3,
          p: 2.5,
          background: `linear-gradient(120deg, ${color.brand[900]}, #0a6b34 60%, ${color.brand[600]})`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          boxShadow: elevation.e3,
        }}
      >
        <Box sx={{ position: "absolute", top: -30, right: -20, width: 130, height: 130, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.6)" }}>
              KIZ eCard
            </Typography>
            <Typography sx={{ fontFamily: "var(--font-fraunces), serif", fontSize: 18, fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
              {user.matricId} · {[user.block, user.roomNumber].filter(Boolean).join(" • ") || "Block not assigned"}
            </Typography>
          </Box>
          <Button
            component={Link}
            href={`/${role}/kad-maya`}
            sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.16)", "&:hover": { backgroundColor: "rgba(255,255,255,0.26)" } }}
            startIcon={<KIcon icon="qr_code_2" size={18} />}
          >
            Show QR
          </Button>
        </Box>
      </Box>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif" }}>
              Recent Bookings
            </Typography>
            <Button component={Link} href={`/${role}/tempahan`} size="small">
              View all
            </Button>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {bookings.map((b) => (
              <Box
                key={b.id}
                sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: b.status === "approved" ? color.success.soft : color.warning.soft,
                    color: b.status === "approved" ? color.success.ink : color.warning.ink,
                  }}
                >
                  <KIcon icon={b.status === "approved" ? "check_circle" : "schedule"} size={18} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.facility.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {new Date(b.timeSlotStart).toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}
                  </Typography>
                </Box>
                <StatusChip status={b.status} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Announcements */}
      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif" }}>
            Announcements
          </Typography>
          <Button component={Link} href={`/${role}/pengumuman`} size="small">
            View all
          </Button>
        </Box>
        {announcements.length === 0 ? (
          <KCard><Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>No announcements yet.</Typography></KCard>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {announcements.map((a) => (
              <Link key={a.id} href={`/${role}/pengumuman`} style={{ textDecoration: "none", color: "inherit" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: a.isPinned ? color.brand[400] : "divider",
                    backgroundColor: "background.paper",
                    "&:hover": { borderColor: color.brand[400] },
                  }}
                >
                  <Box sx={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: a.isPinned ? color.brand[50] : "action.hover", color: a.isPinned ? color.brand[700] : "text.secondary", flexShrink: 0 }}>
                    <KIcon icon={a.isPinned ? "push_pin" : "campaign"} size={18} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "capitalize" }}>
                      {a.tag} · {new Date(a.createdAt).toLocaleDateString("ms-MY", { day: "numeric", month: "short" })}
                    </Typography>
                  </Box>
                </Box>
              </Link>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

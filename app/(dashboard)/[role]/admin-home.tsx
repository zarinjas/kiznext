"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Grid from "@mui/material/Grid"
import Button from "@mui/material/Button"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatCard } from "@/components/kiz/patterns/stat-card"
import { KCard } from "@/components/kiz/primitives/k-card"
import { color } from "@/lib/theme"

interface Props {
  title: string
  description: string
  userName: string
  role: string
  stats: {
    pendingFacility: number
    pendingGuestHouse: number
    openTickets: number
    activeParcels: number
    activeLostFound: number
  }
}

export function AdminHome({ title, description, userName, role, stats }: Props) {
  const canManage = role === "admin_kiz" || role === "superadmin"
  const isPengetua = role === "pengetua"

  const cards = [
    {
      label: "Pending Bookings",
      value: stats.pendingFacility,
      href: "urus-tempahan-fasiliti",
      icon: "task_alt",
      tone: "warning" as const,
    },
    {
      label: "Pending Guest House",
      value: stats.pendingGuestHouse,
      href: "urus-rumah-tamu",
      icon: "hotel",
      tone: "info" as const,
    },
    {
      label: "Open Tickets",
      value: stats.openTickets,
      href: "urus-helpdesk",
      icon: "inbox",
      tone: "brand" as const,
    },
    {
      label: "Unclaimed Parcels",
      value: stats.activeParcels,
      href: "urus-parcel",
      icon: "inventory_2",
      tone: "success" as const,
    },
    {
      label: "Active Lost & Found",
      value: stats.activeLostFound,
      href: "hilang",
      icon: "search",
      tone: "danger" as const,
    },
  ]

  const visibleCards = canManage ? cards : cards.filter((c) => c.href === "hilang")
  const totalPending = stats.pendingFacility + stats.pendingGuestHouse
  const initial = (userName.trim().charAt(0) || "K").toUpperCase()

  return (
    <Box sx={{ maxWidth: 1080, mx: "auto" }}>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              {isPengetua ? "Principal view · read only" : "College operations"}
            </Typography>
            <Typography variant="h1" sx={{ fontFamily: "var(--font-sans), sans-serif" }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {description}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, pr: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: color.brand[900], color: color.brand[300], fontFamily: "var(--font-sans), sans-serif", fontWeight: 600 }}>
              {initial}
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}>Welcome,</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{userName}</Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {canManage && totalPending > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 2,
            mb: 2.5,
            borderRadius: 2,
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
          }}
        >
          <KIcon icon="schedule" size={22} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You have {totalPending} booking{totalPending === 1 ? "" : "s"} pending your approval.
            </Typography>
          </Box>
          <Button
            component={Link}
            href={`/${role}/urus-tempahan-fasiliti`}
            size="small"
            variant="contained"
            startIcon={<KIcon icon="arrow_forward" size={16} />}
          >
            Review now
          </Button>
        </Box>
      )}

      <Grid container spacing={1.5}>
        {visibleCards.map((card) => (
          <Grid key={card.href} size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <Link href={`/${role}/${card.href}`} style={{ textDecoration: "none", color: "inherit" }}>
              <StatCard label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
            </Link>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <KCard>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif" }}>
              Quick Actions
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {canManage && (
              <>
                <Button
                  component={Link}
                  href={`/${role}/urus-pengumuman`}
                  variant="contained"
                  startIcon={<KIcon icon="campaign" size={17} />}
                >
                  Publish Announcement
                </Button>
                <Button
                  component={Link}
                  href={`/${role}/urus-parcel`}
                  variant="outlined"
                  startIcon={<KIcon icon="inventory_2" size={17} />}
                >
                  Register Parcel
                </Button>
                <Button
                  component={Link}
                  href={`/${role}/urus-helpdesk`}
                  variant="outlined"
                  startIcon={<KIcon icon="inbox" size={17} />}
                >
                  Helpdesk Inbox
                </Button>
              </>
            )}
            <Button
              component={Link}
              href={`/${role}/chat`}
              variant="outlined"
              startIcon={<KIcon icon="forum" size={17} />}
            >
              Community Chat
            </Button>
            {!canManage && (
              <Button
                component={Link}
                href={`/${role}/pengumuman`}
                variant="outlined"
                startIcon={<KIcon icon="campaign" size={17} />}
              >
                View Announcements
              </Button>
            )}
          </Box>
        </KCard>
      </Box>
    </Box>
  )
}

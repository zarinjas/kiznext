"use client"

import { useState, useEffect } from "react"
import Box from "@mui/material/Box"
import { NavRail } from "./nav-rail"
import { NavDrawer } from "./nav-drawer"
import { GlassTopBar } from "./glass-top-bar"
import { BottomNav } from "./bottom-nav"
import { MoreSheet } from "./more-sheet"
import { CommandPalette } from "./command-palette"
import { NotificationDrawer } from "./notification-drawer"
import type { Role } from "@/lib/rbac"

/** AppShell — one shell for every role: desktop rail + mobile drawer/bottom nav. */
export function AppShell({
  role,
  userName,
  logoUrl,
  title,
  notificationCount = 0,
  bilikOpen = false,
  children,
}: {
  role: Role
  userName: string
  logoUrl: string | null
  title?: string
  notificationCount?: number
  /** True while the room-selection window is open — drives nav badges + dashboard hints. */
  bilikOpen?: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCommandOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", backgroundColor: "background.default" }}>
      <NavRail role={role} userName={userName} logoUrl={logoUrl} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} bilikOpen={bilikOpen} />

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <GlassTopBar
          role={role}
          title={title}
          onMenu={() => setMenuOpen(true)}
          onCommand={() => setCommandOpen(true)}
          onNotifications={() => setNotifOpen(true)}
          notificationCount={notificationCount}
          logoUrl={logoUrl}
        />
        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2.5, sm: 3.5 },
            pb: { xs: "calc(56px + env(safe-area-inset-bottom) + 24px)", md: 4 },
            maxWidth: 1440,
            width: "100%",
            marginInline: "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      <BottomNav role={role} bilikOpen={bilikOpen} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} role={role} bilikOpen={bilikOpen} />
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} userName={userName} logoUrl={logoUrl} bilikOpen={bilikOpen} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} role={role} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </Box>
  )
}

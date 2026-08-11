"use client"

import { useState, useEffect } from "react"
import Box from "@mui/material/Box"
import { NavRail } from "./nav-rail"
import { GlassTopBar } from "./glass-top-bar"
import { BottomNav } from "./bottom-nav"
import { MoreSheet } from "./more-sheet"
import { CommandPalette } from "./command-palette"
import { NotificationDrawer } from "./notification-drawer"
import type { Role } from "@/lib/rbac"

/** AppShell — one shell for every role: desktop rail + mobile bottom nav. */
export function AppShell({
  role,
  userName,
  logoUrl,
  title,
  notificationCount = 0,
  children,
}: {
  role: Role
  userName: string
  logoUrl: string | null
  title?: string
  notificationCount?: number
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
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
      <NavRail role={role} userName={userName} logoUrl={logoUrl} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <GlassTopBar
          role={role}
          title={title}
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
            py: { xs: 2, sm: 3 },
            pb: { xs: "calc(64px + env(safe-area-inset-bottom) + 16px)", md: 3 },
            maxWidth: 1440,
            width: "100%",
            marginInline: "auto",
          }}
        >
          {children}
        </Box>
      </Box>

      <BottomNav role={role} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} role={role} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} role={role} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </Box>
  )
}

"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import { useColorScheme } from "@mui/material/styles"
import { glass, color } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"
import type { Role } from "@/lib/rbac"

/** GlassTopBar — breadcrumb, ⌘K search, notifications, mobile brand. */
export function GlassTopBar({
  role,
  title,
  onCommand,
  onNotifications,
  notificationCount,
  logoUrl,
}: {
  role: Role
  title?: string
  onCommand: () => void
  onNotifications: () => void
  notificationCount?: number
  logoUrl?: string | null
}) {
  const { mode, setMode } = useColorScheme()
  const toggleColorScheme = () => setMode(mode === "dark" ? "light" : "dark")

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        height: 64,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: { xs: 2, sm: 3 },
        background: glass.background,
        backdropFilter: glass.backdropFilter,
        borderBottom: glass.border,
      }}
    >
      {/* Mobile brand */}
      <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1, mr: 1 }}>
        <Link href={`/${role}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 1.5 }}>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 28, width: "auto", objectFit: "contain" }} />
          ) : (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.brand[900],
                color: color.brand[300],
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              KIZ
            </Box>
          )}
        </Link>
      </Box>

      {/* Breadcrumb / title */}
      <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1, minWidth: 0, flex: 1 }}>
        <KIcon icon="apps" size={17} sx={{ color: "text.disabled" }} />
        <Box component="span" sx={{ color: "text.disabled", fontSize: 13.5 }}>KIZ Super App</Box>
        {title && (
          <>
            <KIcon icon="chevron_right" size={16} sx={{ color: "text.disabled" }} />
            <Box component="span" sx={{ color: "text.primary", fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </Box>
          </>
        )}
      </Box>

      <Box sx={{ flex: { xs: 1, sm: 0 } }} />

      {/* Command palette trigger */}
      <Box
        component="button"
        onClick={onCommand}
        sx={{
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: 1,
          height: 34,
          px: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          color: "text.secondary",
          fontSize: 13,
          cursor: "pointer",
          "&:hover": { borderColor: color.brand[400] },
        }}
      >
        <KIcon icon="search" size={17} />
        Search…
        <Box
          component="span"
          sx={{
            ml: 2,
            fontSize: 11,
            fontWeight: 600,
            color: "text.disabled",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
          }}
        >
          ⌘K
        </Box>
      </Box>

      {/* Dark mode toggle */}
      <Box
        component="button"
        onClick={toggleColorScheme}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          color: "text.secondary",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": { borderColor: color.brand[400] },
        }}
      >
        <KIcon icon={mode === "dark" ? "light_mode" : "dark_mode"} size={19} />
      </Box>

      {/* Notifications */}
      <Box
        component="button"
        onClick={onNotifications}
        aria-label="Notifications"
        sx={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          color: "text.secondary",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": { borderColor: color.brand[400] },
        }}
      >
        <KIcon icon="notifications" size={19} />
        {(notificationCount ?? 0) > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              paddingInline: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.danger.main,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {notificationCount}
          </Box>
        )}
      </Box>
    </Box>
  )
}

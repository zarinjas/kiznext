"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import { useColorScheme } from "@mui/material/styles"
import { glass, color } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"
import type { Role } from "@/lib/rbac"

/** GlassTopBar — minimal frosted bar: breadcrumb, ⌘K search, theme, notifications. */
export function GlassTopBar({
  role,
  title,
  onMenu,
  onCommand,
  onNotifications,
  notificationCount,
  logoUrl,
}: {
  role: Role
  title?: string
  onMenu: () => void
  onCommand: () => void
  onNotifications: () => void
  notificationCount?: number
  logoUrl?: string | null
}) {
  const { mode, setMode } = useColorScheme()
  const toggleColorScheme = () => setMode(mode === "dark" ? "light" : "dark")

  const iconBtn = {
    width: 34,
    height: 34,
    borderRadius: 2.5,
    border: "none",
    backgroundColor: "transparent",
    color: "text.secondary",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 140ms, background-color 140ms",
    "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
  } as const

  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        height: 60,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: { xs: 1.5, sm: 2.5 },
        background: glass.background,
        backdropFilter: glass.backdropFilter,
        WebkitBackdropFilter: glass.backdropFilter,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Mobile menu — opens the full sidebar as a drawer */}
      <Box
        component="button"
        onClick={onMenu}
        aria-label="Open menu"
        sx={{ ...iconBtn, display: { xs: "flex", md: "none" } }}
      >
        <KIcon icon="menu" size={20} />
      </Box>

      {/* Mobile brand */}
      <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", mr: 0.5 }}>
        <Link href={`/${role}`} style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 26, width: "auto", objectFit: "contain" }} />
          ) : (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.brand[900],
                color: "#fff",
                fontSize: 14,
                fontWeight: 650,
                letterSpacing: "-0.02em",
              }}
            >
              K
            </Box>
          )}
        </Link>
      </Box>

      {/* Breadcrumb */}
      <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.5, minWidth: 0, flex: 1 }}>
        {title && (
          <Box component="span" sx={{ color: "text.primary", fontSize: 13.5, fontWeight: 550, letterSpacing: "-0.011em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </Box>
        )}
      </Box>

      <Box sx={{ flex: { xs: 1, sm: 0 } }} />

      {/* Search */}
      <Box
        component="button"
        onClick={onCommand}
        sx={{
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: 1,
          height: 34,
          pl: 1.25,
          pr: 0.75,
          mr: 0.5,
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
          color: "text.disabled",
          fontSize: 13,
          letterSpacing: "-0.011em",
          cursor: "pointer",
          transition: "border-color 140ms",
          "&:hover": { borderColor: color.borderStrong },
        }}
      >
        <KIcon icon="search" size={16} />
        <Box component="span" sx={{ mr: 2.5 }}>Search</Box>
        <Box
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: "text.disabled",
            backgroundColor: "action.hover",
            borderRadius: 1,
            px: 0.625,
            py: 0.25,
            lineHeight: 1.4,
          }}
        >
          ⌘K
        </Box>
      </Box>

      <Box component="button" onClick={onCommand} aria-label="Search" sx={{ ...iconBtn, display: { xs: "flex", sm: "none" } }}>
        <KIcon icon="search" size={19} />
      </Box>

      <Box
        component="button"
        onClick={toggleColorScheme}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        sx={iconBtn}
      >
        <KIcon icon={mode === "dark" ? "light_mode" : "dark_mode"} size={19} />
      </Box>

      <Box
        component="button"
        onClick={onNotifications}
        aria-label="Notifications"
        sx={{ ...iconBtn, position: "relative" }}
      >
        <KIcon icon="notifications" size={19} />
        {(notificationCount ?? 0) > 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 1,
              right: 1,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              paddingInline: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.danger.main,
              color: "#fff",
              fontSize: 9.5,
              fontWeight: 600,
              border: "2px solid",
              borderColor: "background.default",
              zIndex: 1,
            }}
          >
            {(notificationCount ?? 0) > 99 ? "99+" : notificationCount}
          </Box>
        )}
      </Box>
    </Box>
  )
}

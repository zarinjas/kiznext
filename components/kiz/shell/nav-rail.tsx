"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import { navForRole, ROLE_LABELS } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { signOut } from "next-auth/react"
import type { Role } from "@/lib/rbac"
import { color } from "@/lib/theme"

/** NavRail — collapsible left sidebar. 264px → 72px icon rail. */
export function NavRail({
  role,
  userName,
  logoUrl,
  collapsed,
  onToggle,
}: {
  role: Role
  userName: string
  logoUrl: string | null
  collapsed: boolean
  onToggle: () => void
}) {
  const pathname = usePathname()
  const groups = useMemo(() => navForRole(role), [role])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 72 : 260,
        flexShrink: 0,
        height: "100dvh",
        position: "sticky",
        top: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        borderRight: "1px solid",
        borderColor: "rgba(255,255,255,0.06)",
        backgroundColor: color.brand[900],
        backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 40%)",
        transition: "width 200ms ease",
        zIndex: 10,
      }}
    >
      {/* Logo / brand */}
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          px: collapsed ? 0 : 2.5,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {logoUrl ? (
          <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 32, width: collapsed ? 32 : "auto", objectFit: "contain" }} />
        ) : (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[400],
              color: color.brand[900],
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            KIZ
          </Box>
        )}
        {!collapsed && (
          <Box>
            <Box sx={{ fontWeight: 700, fontSize: 15, color: "#FFFFFF", lineHeight: 1.2 }}>
              KIZ Super App
            </Box>
            <Box sx={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Kolej Ibu Zain · UKM</Box>
          </Box>
        )}
      </Box>

      {/* Nav groups */}
      <Box component="nav" sx={{ flex: 1, overflowY: "auto", py: 2, px: collapsed ? 1 : 1.25, "&::-webkit-scrollbar": { display: "none" } }}>
        {groups.map((group) => (
          <Box key={group.label} sx={{ mb: 2.5 }}>
            {!collapsed && (
              <Box sx={{ px: 1.5, pb: 0.75, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.38)" }}>
                {group.label}
              </Box>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href)
              const link = (
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 1.25,
                      px: collapsed ? 0 : 1.5,
                      py: 0.75,
                      mb: 0.25,
                      borderRadius: 1.75,
                      minHeight: 38,
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? color.brand[900] : "rgba(255,255,255,0.72)",
                      backgroundColor: active ? color.brand[400] : "transparent",
                      "&:hover": {
                        backgroundColor: active ? color.brand[300] : "rgba(255,255,255,0.08)",
                        color: active ? color.brand[900] : "#FFFFFF",
                      },
                      transition: "background-color 150ms ease, color 150ms ease",
                    }}
                  >
                    <KIcon icon={item.icon} size={20} color={active ? color.brand[900] : "inherit"} />
                    {!collapsed && item.label}
                  </Box>
                </Link>
              )
              return collapsed ? (
                <Tooltip key={item.href} title={item.label} placement="right">
                  <Box sx={{ display: "flex", justifyContent: "center" }}>{link}</Box>
                </Tooltip>
              ) : (
                <Box key={item.href}>{link}</Box>
              )
            })}
          </Box>
        ))}
      </Box>

      {/* User / collapse footer */}
      <Box sx={{ borderTop: "1px solid", borderColor: "rgba(255,255,255,0.06)", p: collapsed ? 1 : 1.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 1,
            mb: collapsed ? 1 : 0,
          }}
        >
          {!collapsed && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.brand[400],
                  color: color.brand[900],
                  fontFamily: "var(--font-sans), sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(userName.trim().charAt(0) || "K").toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {userName}
                </Box>
                <Box sx={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{ROLE_LABELS[role]}</Box>
              </Box>
            </Box>
          )}
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Box
              component="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              sx={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 1.5,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                margin: collapsed ? "0 auto" : 0,
              }}
            >
              <KIcon icon={collapsed ? "chevron_right" : "chevron_left"} size={18} />
            </Box>
          </Tooltip>
        </Box>
        {!collapsed && (
          <Box
            component="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              width: "100%",
              mt: 0.75,
              px: 1.5,
              py: 0.75,
              borderRadius: 1.75,
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.08)", color: "#FFB4A8" },
            }}
          >
            <KIcon icon="logout" size={19} />
            Log out
          </Box>
        )}
      </Box>
    </Box>
  )
}

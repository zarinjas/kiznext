"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import { navForRole, ROLE_LABELS, isRoomSelectionItem } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { signOut } from "next-auth/react"
import type { Role } from "@/lib/rbac"
import { color, gradient, radius } from "@/lib/theme"

/**
 * NavRail — light, minimal sidebar. Soft gradient wash, hairline divider,
 * subtle tinted active state. Collapses 256 → 72.
 */
export function NavRail({
  role,
  userName,
  logoUrl,
  collapsed,
  onToggle,
  bilikOpen = false,
}: {
  role: Role
  userName: string
  logoUrl: string | null
  collapsed: boolean
  onToggle: () => void
  bilikOpen?: boolean
}) {
  const pathname = usePathname()
  const groups = useMemo(() => navForRole(role), [role])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 72 : 256,
        flexShrink: 0,
        height: "100dvh",
        position: "sticky",
        top: 0,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        backgroundColor: "background.default",
        backgroundImage: gradient.rail,
        "[data-mui-color-scheme='dark'] &": { backgroundImage: "none" },
        borderRight: "1px solid",
        borderColor: "divider",
        transition: "width 220ms cubic-bezier(0.22,1,0.36,1)",
        zIndex: 10,
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          height: 60,
          display: "flex",
          alignItems: "center",
          px: collapsed ? 0 : 2,
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 1.25,
          flexShrink: 0,
        }}
      >
        {logoUrl ? (
          <Box
            component="img"
            src={logoUrl}
            alt="KIZ"
            sx={{ height: collapsed ? 28 : 50, width: collapsed ? 28 : "auto", objectFit: "contain", borderRadius: 0.4 }}
          />
        ) : (
          <Box
            sx={{
              width: collapsed ? 30 : 36,
              height: collapsed ? 30 : 36,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: color.brand[900],
              color: "#fff",
              fontSize: collapsed ? 14 : 17,
              fontWeight: 650,
              letterSpacing: "-0.02em",
            }}
          >
            K
          </Box>
        )}
      </Box>

      {/* Nav */}
      <Box
        component="nav"
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 1,
          px: collapsed ? 1 : 1.5,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {groups.map((group) => (
          <Box key={group.label} sx={{ mb: 1.75 }}>
            {!collapsed && (
              <Box
                sx={{
                  px: 1.25,
                  pb: 0.5,
                  fontSize: 11,
                  fontWeight: 550,
                  color: "text.disabled",
                  letterSpacing: "-0.005em",
                }}
              >
                {group.label}
              </Box>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href)
              const roomBadge = isRoomSelectionItem(item) && bilikOpen
              const link = (
                <Link href={item.href} style={{ textDecoration: "none" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: 1.25,
                      px: collapsed ? 0 : 1.25,
                      py: 0,
                      mb: 0.25,
                      borderRadius: `${radius.button}px`,
                      minHeight: 34,
                      fontSize: 13.5,
                      fontWeight: active ? 550 : 450,
                      letterSpacing: "-0.011em",
                      color: active ? "text.primary" : "text.secondary",
                      backgroundColor: active ? "action.hover" : "transparent",
                      transition: "background-color 140ms ease, color 140ms ease",
                      "&:hover": {
                        color: "text.primary",
                        backgroundColor: "action.hover",
                      },
                    }}
                  >
                    <Box sx={{ position: "relative", width: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <KIcon
                        icon={item.icon}
                        size={19}
                        weight={active ? 500 : 400}
                        sx={{ opacity: active ? 1 : 0.75 }}
                      />
                      {roomBadge && (
                        <Box
                          sx={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            backgroundColor: color.warning.main,
                            border: "1.5px solid",
                            borderColor: "background.default",
                          }}
                        />
                      )}
                    </Box>
                    {!collapsed && item.label}
                    {!collapsed && roomBadge && (
                      <Box
                        sx={{
                          fontSize: 10,
                          fontWeight: 650,
                          color: color.warning.ink,
                          backgroundColor: color.warning.soft,
                          px: 0.625,
                          py: 0.25,
                          borderRadius: 999,
                          lineHeight: 1.4,
                        }}
                      >
                        Open
                      </Box>
                    )}
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

      {/* User */}
      <Box sx={{ p: collapsed ? 1 : 1.5, flexShrink: 0, borderTop: "1px solid", borderColor: "divider" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: color.brand[100],
                color: "text.primary",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {(userName.trim().charAt(0) || "K").toUpperCase()}
            </Box>
            {!collapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ fontSize: 13, fontWeight: 550, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.011em" }}>
                  {userName}
                </Box>
                <Box sx={{ fontSize: 11.5, color: "text.secondary" }}>
                  {ROLE_LABELS[role]}
                </Box>
              </Box>
            )}
          </Box>
          {!collapsed && (
            <Tooltip title="Log out">
              <Box
                component="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                aria-label="Log out"
                sx={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "text.disabled",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 2,
                  flexShrink: 0,
                  "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
                }}
              >
                <KIcon icon="logout" size={17} />
              </Box>
            </Tooltip>
          )}
        </Box>

        <Tooltip title={collapsed ? "Expand" : "Collapse"} placement="right">
          <Box
            component="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            sx={{
              mt: 1,
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "text.disabled",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              height: 30,
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 500,
              "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
            }}
          >
            <KIcon icon={collapsed ? "chevron_right" : "chevron_left"} size={17} />
            {!collapsed && "Collapse"}
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}

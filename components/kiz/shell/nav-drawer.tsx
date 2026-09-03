"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import { navForRole, ROLE_LABELS, isRoomSelectionItem } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { signOut } from "next-auth/react"
import type { Role } from "@/lib/rbac"
import { color, gradient, radius } from "@/lib/theme"

/**
 * NavDrawer — the mobile sidebar. A left drawer holding the full role menu,
 * mirroring the desktop NavRail so nothing is unreachable on phones.
 */
export function NavDrawer({
  open,
  onClose,
  role,
  userName,
  logoUrl,
  bilikOpen = false,
}: {
  open: boolean
  onClose: () => void
  role: Role
  userName: string
  logoUrl: string | null
  bilikOpen?: boolean
}) {
  const pathname = usePathname()
  const groups = useMemo(() => navForRole(role), [role])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 292, maxWidth: "86vw" } } }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "background.default",
          backgroundImage: gradient.rail,
          "[data-mui-color-scheme='dark'] &": { backgroundImage: "none" },
        }}
      >
        {/* Brand */}
        <Box
          sx={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            {logoUrl ? (
              <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 34, width: "auto", objectFit: "contain", borderRadius: 0.4 }} />
            ) : (
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.brand[900],
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 650,
                  letterSpacing: "-0.02em",
                }}
              >
                K
              </Box>
            )}
          </Box>
          <Box
            component="button"
            onClick={onClose}
            aria-label="Close menu"
            sx={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "text.disabled",
              width: 30,
              height: 30,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "&:hover": { backgroundColor: "action.hover", color: "text.primary" },
            }}
          >
            <KIcon icon="close" size={19} />
          </Box>
        </Box>

        {/* Nav */}
        <Box
          component="nav"
          sx={{ flex: 1, overflowY: "auto", py: 1, px: 1.5, "&::-webkit-scrollbar": { display: "none" }, scrollbarWidth: "none" }}
        >
          {groups.map((group) => (
            <Box key={group.label} sx={{ mb: 1.75 }}>
              <Box sx={{ px: 1.25, pb: 0.5, fontSize: 11, fontWeight: 550, color: "text.disabled", letterSpacing: "-0.005em" }}>
                {group.label}
              </Box>
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={onClose}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        px: 1.25,
                        mb: 0.25,
                        borderRadius: `${radius.button}px`,
                        minHeight: 42,
                        fontSize: 13.5,
                        fontWeight: active ? 550 : 450,
                        letterSpacing: "-0.011em",
                        color: active ? "text.primary" : "text.secondary",
                        backgroundColor: active ? "action.hover" : "transparent",
                        transition: "background-color 140ms ease, color 140ms ease",
                        "&:active": { backgroundColor: "action.hover" },
                      }}
                    >
                      <Box sx={{ position: "relative", width: 19, height: 19, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <KIcon icon={item.icon} size={19} weight={active ? 500 : 400} sx={{ opacity: active ? 1 : 0.75 }} />
                        {isRoomSelectionItem(item) && bilikOpen && (
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
                      <Box sx={{ flex: 1, minWidth: 0 }}>{item.label}</Box>
                      {isRoomSelectionItem(item) && bilikOpen && (
                        <Box
                          sx={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: color.warning.ink,
                            backgroundColor: color.warning.soft,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 999,
                          }}
                        >
                          Open
                        </Box>
                      )}
                    </Box>
                  </Link>
                )
              })}
            </Box>
          ))}
        </Box>

        {/* User */}
        <Box sx={{ p: 1.5, flexShrink: 0, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 0.5, mb: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: color.brand[100],
                color: "text.primary",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {(userName.trim().charAt(0) || "K").toUpperCase()}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ fontSize: 13, fontWeight: 550, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "-0.011em" }}>
                {userName}
              </Box>
              <Box sx={{ fontSize: 11.5, color: "text.secondary" }}>{ROLE_LABELS[role]}</Box>
            </Box>
          </Box>
          <Box
            component="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              width: "100%",
              px: 1.25,
              py: 0.875,
              borderRadius: `${radius.button}px`,
              fontSize: 13.5,
              fontWeight: 500,
              color: "error.main",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              "&:active": { backgroundColor: "action.hover" },
            }}
          >
            <KIcon icon="logout" size={18} />
            Log out
          </Box>
        </Box>
      </Box>
    </Drawer>
  )
}

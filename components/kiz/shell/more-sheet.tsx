"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import { navForRole, isRoomSelectionItem } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { signOut } from "next-auth/react"
import type { Role } from "@/lib/rbac"
import { color } from "@/lib/theme"

/** MoreSheet — mobile "More" drawer listing all remaining nav. */
export function MoreSheet({
  open,
  onClose,
  role,
  bilikOpen = false,
}: {
  open: boolean
  onClose: () => void
  role: Role
  bilikOpen?: boolean
}) {
  const pathname = usePathname()
  const groups = navForRole(role)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "86dvh",
            pb: "calc(env(safe-area-inset-bottom) + 8px)",
          },
        },
      }}
    >
      {/* Grabber */}
      <Box sx={{ display: "flex", justifyContent: "center", pt: 1.25, pb: 0.5 }}>
        <Box sx={{ width: 40, height: 5, borderRadius: 999, backgroundColor: "divider" }} />
      </Box>
      <Box sx={{ px: 2, pb: 1 }}>
        <Box sx={{ fontSize: 19, fontWeight: 640, letterSpacing: "-0.026em", mb: 2, px: 0.5 }}>
          Menu
        </Box>
        {groups.map((g) => (
          <Box key={g.label} sx={{ mb: 2 }}>
            <Box sx={{ px: 0.5, pb: 0.5, fontSize: 11.5, fontWeight: 500, color: "text.disabled" }}>
              {g.label}
            </Box>
            {g.items.map((item) => {
              const active = isActive(item.href)
              const roomBadge = isRoomSelectionItem(item) && bilikOpen
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={onClose}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2.5,
                      fontSize: 14.5,
                      fontWeight: active ? 600 : 450,
                      letterSpacing: "-0.011em",
                      color: active ? "text.primary" : "text.secondary",
                      backgroundColor: active ? "action.hover" : "transparent",
                      "&:active": { backgroundColor: "action.hover" },
                    }}
                  >
                    <KIcon icon={item.icon} size={21} filled={active} sx={{ opacity: active ? 1 : 0.7 }} />
                    <Box sx={{ flex: 1 }}>{item.label}</Box>
                    {roomBadge && (
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

        <Box
          component="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
            px: 1.5,
            py: 1.25,
            borderRadius: 2.5,
            fontSize: 14.5,
            fontWeight: 500,
            color: "error.main",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            "&:active": { backgroundColor: "action.hover" },
          }}
        >
          <KIcon icon="logout" size={22} />
          Log out
        </Box>
      </Box>
    </Drawer>
  )
}

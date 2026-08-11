"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Box from "@mui/material/Box"
import Drawer from "@mui/material/Drawer"
import { navForRole } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { signOut } from "next-auth/react"
import { color } from "@/lib/theme"
import type { Role } from "@/lib/rbac"

/** MoreSheet — mobile "More" drawer listing all remaining nav. */
export function MoreSheet({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const pathname = usePathname()
  const groups = navForRole(role)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: "min(320px, 88vw)" } } }}>
      <Box sx={{ p: 1.5 }}>
        {groups.map((g) => (
          <Box key={g.label} sx={{ mb: 2 }}>
            <Box sx={{ px: 1.5, pb: 0.75, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.disabled" }}>
              {g.label}
            </Box>
            {g.items.map((item) => {
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} onClick={onClose}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      px: 1.5,
                      py: 0.9,
                      borderRadius: 1.75,
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      color: active ? "primary.contrastText" : "text.secondary",
                      backgroundColor: active ? color.brand[900] : "transparent",
                      "&:hover": { backgroundColor: active ? color.brand[900] : "action.hover" },
                    }}
                  >
                    <KIcon icon={item.icon} size={20} color={active ? color.brand[300] : "inherit"} />
                    {item.label}
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
            gap: 1.25,
            width: "100%",
            px: 1.5,
            py: 0.9,
            borderRadius: 1.75,
            fontSize: 13.5,
            fontWeight: 500,
            color: "error.main",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          <KIcon icon="logout" size={20} />
          Log out
        </Box>
      </Box>
    </Drawer>
  )
}

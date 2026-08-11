"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Box from "@mui/material/Box"
import { navForRole } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"
import type { Role } from "@/lib/rbac"

/** BottomNav — mobile 5-slot nav (home, bookings, chat, more/eCard). */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const groups = navForRole(role)

  const find = (label: string) => {
    for (const g of groups) {
      const item = g.items.find((i) => i.label === label)
      if (item) return item
    }
    return null
  }

  const home = groups[0]?.items[0]
  const facilities = find("Facilities")
  const chat = find("Community Chat")
  const kad = find("Kad Maya")

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const slots = [home, facilities, chat].filter(Boolean) as { label: string; href: string; icon: string }[]

  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        bottom: 0,
        insetInline: 0,
        zIndex: 20,
        display: { xs: "flex", md: "none" },
        height: 64,
        alignItems: "center",
        justifyContent: "space-around",
        px: 1.5,
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(14px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {slots.map((s) => {
        const active = isActive(s.href)
        return (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.25,
                minWidth: 56,
                color: active ? color.brand[700] : "text.secondary",
              }}
            >
              <KIcon icon={s.icon} size={22} filled={active} />
              <Box sx={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{s.label}</Box>
            </Box>
          </Link>
        )
      })}

      {/* Center eCard action */}
      <Link href={kad?.href ?? `/${role}/kad-maya`} style={{ textDecoration: "none" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, color: isActive(kad?.href ?? "") ? color.brand[700] : "text.secondary" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[900],
              color: color.brand[300],
              mt: -2.5,
              border: "3px solid",
              borderColor: "background.default",
            }}
          >
            <KIcon icon="qr_code_2" size={22} />
          </Box>
          <Box sx={{ fontSize: 10.5, fontWeight: isActive(kad?.href ?? "") ? 700 : 500 }}>eCard</Box>
        </Box>
      </Link>

      <Link href={`/${role}/lagi`} style={{ textDecoration: "none" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25, color: isActive(`/${role}/lagi`) ? color.brand[700] : "text.secondary" }}>
          <KIcon icon="grid_view" size={22} filled={isActive(`/${role}/lagi`)} />
          <Box sx={{ fontSize: 10.5, fontWeight: isActive(`/${role}/lagi`) ? 700 : 500 }}>More</Box>
        </Box>
      </Link>
    </Box>
  )
}

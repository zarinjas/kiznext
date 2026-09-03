"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Box from "@mui/material/Box"
import { navForRole } from "./nav-config"
import { KIcon } from "@/components/kiz/primitives/icon"
import { glass, color } from "@/lib/theme"
import type { Role } from "@/lib/rbac"

/**
 * BottomNav — native-app tab bar. Flush frosted bar, 5 equal slots,
 * iOS-style icon + label, safe-area aware. No raised FAB.
 */
export function BottomNav({ role, bilikOpen = false }: { role: Role; bilikOpen?: boolean }) {
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
  const kad = find("eCard")
  const chat = find("Community Chat")

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  const tabs = [
    home && { label: "Home", href: home.href, icon: "home" },
    facilities && { label: "Book", href: facilities.href, icon: facilities.icon },
    kad && { label: "eCard", href: kad.href, icon: kad.icon },
    chat && { label: "Chat", href: chat.href, icon: chat.icon },
    { label: "More", href: `/${role}/lagi`, icon: "grid_view" },
  ].filter(Boolean) as { label: string; href: string; icon: string }[]

  return (
    <Box
      component="nav"
      sx={{
        position: "fixed",
        bottom: 0,
        insetInline: 0,
        zIndex: 20,
        display: { xs: "flex", md: "none" },
        alignItems: "stretch",
        minHeight: 56,
        pb: "env(safe-area-inset-bottom)",
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: glass.background,
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
      }}
    >
      {tabs.map((t) => {
        const active = isActive(t.href)
        const isMore = t.href.endsWith("/lagi")
        return (
          <Link key={t.href} href={t.href} style={{ textDecoration: "none", flex: 1 }}>
            <Box
              sx={{
                minHeight: 56,
                py: 0.5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.25,
                color: active ? "text.primary" : "text.disabled",
                transition: "color 150ms",
                "&:active": { opacity: 0.6 },
              }}
            >
              <Box sx={{ position: "relative", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <KIcon icon={t.icon} size={22} filled={active} weight={active ? 500 : 400} />
                {isMore && bilikOpen && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -1,
                      right: -1,
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: color.warning.main,
                      border: "1.5px solid",
                      borderColor: "background.default",
                    }}
                  />
                )}
              </Box>
              <Box sx={{ fontSize: 10.5, fontWeight: active ? 600 : 450, letterSpacing: "-0.01em" }}>
                {t.label}
              </Box>
            </Box>
          </Link>
        )
      })}
    </Box>
  )
}

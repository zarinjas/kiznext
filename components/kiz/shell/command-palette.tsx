"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import Dialog from "@mui/material/Dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { navForRole } from "./nav-config"
import { color, radius, elevation } from "@/lib/theme"
import type { Role } from "@/lib/rbac"

/** CommandPalette — ⌘K fuzzy navigation. */
export function CommandPalette({
  open,
  onClose,
  role,
}: {
  open: boolean
  onClose: () => void
  role: Role
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset search whenever the palette opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setActive(0)
        setQuery("")
        inputRef.current?.focus()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [open])

  const items = useMemo(() => {
    const groups = navForRole(role)
    return groups.flatMap((g) => g.items)
  }, [role])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.href.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)) }
      if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
      if (e.key === "Enter" && filtered[active]) {
        router.push(filtered[active].href)
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, filtered, active, router, onClose])

  // Global ⌘K / Ctrl-K toggle
  useEffect(() => {
    const onGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onClose() // parent handles toggle
      }
    }
    window.addEventListener("keydown", onGlobal)
    return () => window.removeEventListener("keydown", onGlobal)
  }, [onClose])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: radius.sheet, boxShadow: elevation.e4, maxWidth: 560, width: "100%" } } }}
    >
      <Box sx={{ p: 1.5 }}>
        <TextField
          fullWidth
          autoFocus
          inputRef={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0) }}
          placeholder="Search pages and actions…"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <KIcon icon="search" size={20} sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Box
                    component="span"
                    sx={{ fontSize: 11, fontWeight: 600, color: "text.disabled", border: "1px solid", borderColor: "divider", borderRadius: 1, px: 0.75, py: 0.25 }}
                  >
                    ESC
                  </Box>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 360, overflowY: "auto", p: 1, pt: 0 }}>
        {filtered.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center", color: "text.secondary", fontSize: 13.5 }}>
            No results for “{query}”
          </Box>
        )}
        {filtered.map((item, i) => {
          const current = pathname === item.href
          return (
            <Box
              key={item.href}
              onClick={() => { router.push(item.href); onClose() }}
              onMouseEnter={() => setActive(i)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                cursor: "pointer",
                backgroundColor: i === active ? color.brand[50] : "transparent",
                fontSize: 13.5,
                fontWeight: current ? 600 : 500,
                color: current ? color.brand[800] : "text.primary",
              }}
            >
              <KIcon icon={item.icon} size={19} color={i === active ? color.brand[700] : "inherit"} />
              <Box sx={{ flex: 1 }}>{item.label}</Box>
              <KIcon icon="arrow_forward" size={16} sx={{ color: "text.disabled" }} />
            </Box>
          )
        })}
      </Box>
    </Dialog>
  )
}

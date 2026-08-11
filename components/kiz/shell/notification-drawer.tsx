"use client"

import Drawer from "@mui/material/Drawer"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

/**
 * NotificationDrawer — right-side activity feed.
 * Interim: derived server-side until the notifications table ships.
 */
export function NotificationDrawer({
  open,
  onClose,
  items = [],
}: {
  open: boolean
  onClose: () => void
  items?: { id: string; icon: string; tone?: string; title: string; time: string; href: string }[]
}) {
  const toneMap: Record<string, { bg: string; fg: string }> = {
    success: { bg: color.success.soft, fg: color.success.ink },
    warning: { bg: color.warning.soft, fg: color.warning.ink },
    info: { bg: color.info.soft, fg: color.info.ink },
    danger: { bg: color.danger.soft, fg: color.danger.ink },
    brand: { bg: color.brand[50], fg: color.brand[700] },
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: "min(380px, 92vw)" } } }}
    >
      <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 560 }}>
          Notifications
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Recent updates from KIZ
        </Typography>
      </Box>

      <Box sx={{ p: 1.5, flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <Box sx={{ mt: 3 }}>
            <KEmpty icon="notifications_none" title="You're all caught up" body="New notifications will appear here." compact />
          </Box>
        ) : (
          items.map((n) => {
            const t = toneMap[n.tone ?? "brand"] ?? toneMap.brand
            return (
              <Box
                key={n.id}
                component="a"
                href={n.href}
                onClick={onClose}
                sx={{
                  display: "flex",
                  gap: 1.25,
                  p: 1.25,
                  borderRadius: 2,
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                <Box sx={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: t.bg, color: t.fg, flexShrink: 0 }}>
                  <KIcon icon={n.icon} size={17} />
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    {n.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.disabled" }}>
                    {n.time}
                  </Typography>
                </Box>
              </Box>
            )
          })
        )}
      </Box>
    </Drawer>
  )
}

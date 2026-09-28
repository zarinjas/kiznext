"use client"

import { useRouter } from "next/navigation"
import Drawer from "@mui/material/Drawer"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notification-actions"
import type { NotificationView } from "@/lib/notification-meta"

/**
 * NotificationDrawer — right-side feed of the signed-in user's notifications.
 * Items come from the `notifications` table (see `lib/notifications.ts`).
 */
export function NotificationDrawer({
  open,
  onClose,
  items = [],
}: {
  open: boolean
  onClose: () => void
  items?: NotificationView[]
}) {
  const router = useRouter()
  const unread = items.filter((n) => !n.read).length

  function openItem(item: NotificationView) {
    if (!item.read) void markNotificationRead(item.id)
    onClose()
    if (item.link) {
      if (/^https?:\/\//.test(item.link)) window.location.assign(item.link)
      else router.push(item.link)
    } else {
      router.refresh()
    }
  }

  async function markAll() {
    await markAllNotificationsRead()
    router.refresh()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: "min(400px, 92vw)" } } }}
    >
      <Box
        sx={{
          p: 2.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Box>
          <Typography variant="h3">Notifications</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Recent updates from KIZ
          </Typography>
        </Box>
        {unread > 0 && (
          <Button size="small" onClick={markAll} sx={{ textTransform: "none", flexShrink: 0 }}>
            Mark all read
          </Button>
        )}
      </Box>

      <Box sx={{ p: 1.5, flex: 1, overflowY: "auto" }}>
        {items.length === 0 ? (
          <Box sx={{ mt: 3 }}>
            <KEmpty icon="notifications_none" title="You're all caught up" body="New notifications will appear here." compact />
          </Box>
        ) : (
          items.map((n) => (
            <Box
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openItem(n)
                }
              }}
              sx={{
                display: "flex",
                gap: 1.25,
                p: 1.25,
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "none",
                cursor: "pointer",
                borderRadius: `${radius.input}px`,
                color: "inherit",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: n.read ? color.neutral.soft : color.brand[50],
                  color: n.read ? color.neutral.ink : color.brand[700],
                  flexShrink: 0,
                }}
              >
                <KIcon icon="notifications" size={17} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  {n.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {n.body}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {n.createdAt}
                </Typography>
              </Box>
              {!n.read && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color.brand[500],
                    flexShrink: 0,
                    mt: 0.75,
                  }}
                />
              )}
            </Box>
          ))
        )}
      </Box>
    </Drawer>
  )
}

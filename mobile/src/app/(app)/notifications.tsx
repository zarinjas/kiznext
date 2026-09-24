import { router } from "expo-router"
import { Linking, Pressable } from "react-native"
import { useTheme } from "@shopify/restyle"

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks"
import { notificationLinkTarget } from "@/lib/notifications"
import type { NotificationItem } from "@/lib/types"
import { Box, Icon, KEmpty, LoadingScreen, PageHeader, Screen, Surface, Text, type Theme } from "@/ui"

/**
 * In-app notification inbox. Mirrors the web notification bell — each row is a
 * broadcast the resident received, newest first, with an unread dot.
 */

function openLink(link: string) {
  const target = notificationLinkTarget(link)
  if (!target) return
  if ("external" in target) Linking.openURL(target.external).catch(() => {})
  else router.push(target.route as never)
}

export default function NotificationsScreen() {
  const t = useTheme<Theme>()
  const { data, isLoading, isError, refetch, isRefetching } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = data?.notifications ?? []
  const unread = data?.unreadCount ?? 0

  function open(item: NotificationItem) {
    if (!item.read) markRead.mutate(item.id)
    if (item.link) openLink(item.link)
  }

  if (isLoading) return <LoadingScreen label="Loading notifications…" />

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          unread > 0 ? (
            <Pressable onPress={() => markAll.mutate()} disabled={markAll.isPending}>
              <Text variant="button" color="brand700">
                Mark all read
              </Text>
            </Pressable>
          ) : undefined
        }
      />

      {isError ? (
        <KEmpty icon="error_outline" title="Couldn't load notifications" message="Pull down to try again." />
      ) : items.length === 0 ? (
        <KEmpty
          icon="notifications_none"
          title="Nothing here yet"
          message="Messages from the KIZ office will appear here."
        />
      ) : (
        <Box gap="m">
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => open(item)}
              android_ripple={{ color: t.colors.canvasSunk }}
            >
              <Surface>
                <Box flexDirection="row" alignItems="flex-start" gap="s">
                  <Box
                    width={32}
                    height={32}
                    borderRadius="input"
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={item.read ? "neutralSoft" : "brand50"}
                  >
                    <Icon
                      name="notifications"
                      size={18}
                      color={item.read ? t.colors.ink300 : t.colors.brand700}
                    />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Text variant={item.read ? "subheading" : "bodyStrong"}>{item.title}</Text>
                    <Text variant="body" marginTop="xs">
                      {item.body}
                    </Text>
                    <Text variant="caption" marginTop="s">
                      {item.createdAt}
                    </Text>
                  </Box>
                  {!item.read ? (
                    <Box width={8} height={8} borderRadius="pill" backgroundColor="brand500" marginTop="s" />
                  ) : null}
                </Box>
              </Surface>
            </Pressable>
          ))}
        </Box>
      )}
      <Box height={32} />
    </Screen>
  )
}

import { router } from "expo-router"
import { Linking } from "react-native"
import { useTheme } from "@shopify/restyle"

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks"
import { notificationLinkTarget } from "@/lib/notifications"
import type { NotificationItem } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  Icon,
  KEmpty,
  PageHeader,
  PressScale,
  Screen,
  Skeleton,
  Surface,
  Text,
  type Theme,
} from "@/ui"

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

  const unread = data?.unreadCount ?? 0

  function open(item: NotificationItem) {
    if (!item.read) markRead.mutate(item.id)
    if (item.link) openLink(item.link)
  }

  return (
    <Screen scroll edges={[]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        action={
          unread > 0 ? (
            <PressScale
              onPress={() => markAll.mutate()}
              disabled={markAll.isPending}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
            >
              <Box minHeight={44} justifyContent="center" paddingHorizontal="xs">
                <Text variant="button" color="brand700">
                  Mark all read
                </Text>
              </Box>
            </PressScale>
          ) : undefined
        }
      />

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        skeleton={<Skeleton.Rows count={5} />}
        errorTitle="Couldn't load notifications"
      >
        {(loaded) =>
          (loaded.notifications ?? []).length === 0 ? (
            <KEmpty
              icon="notifications_none"
              title="Nothing here yet"
              message="Messages from the KIZ office will appear here."
            />
          ) : (
            <Box gap="m">
              {(loaded.notifications ?? []).map((item) => (
            <PressScale
              key={item.id}
              onPress={() => open(item)}
              scaleTo={0.99}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? "" : "Unread. "}${item.title}. ${item.body}`}
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
            </PressScale>
              ))}
            </Box>
          )
        }
      </AsyncBoundary>
      <Box height={32} />
    </Screen>
  )
}

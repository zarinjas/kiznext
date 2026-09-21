import { announcementTagMeta, formatMalaysia } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { ActivityIndicator } from "react-native"

import type { Announcement } from "@/lib/types"
import { useAnnouncements } from "@/lib/hooks"
import {
  Box,
  KEmpty,
  PageHeader,
  Screen,
  StatusChip,
  Surface,
  Text,
  type ChipTone,
} from "@/ui"
import { Icon } from "@/ui/icon"

function toneForTag(tag: string): ChipTone {
  switch (tag) {
    case "important":
      return "danger"
    case "event":
      return "info"
    case "sports":
      return "success"
    default:
      return "brand"
  }
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const theme = useTheme()
  const meta = announcementTagMeta(announcement.tag)

  return (
    <Surface>
      <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
        <StatusChip label={meta.label} tone={toneForTag(announcement.tag)} icon={meta.icon} />
        {announcement.isPinned ? (
          <StatusChip label="Pinned" tone="warning" icon="push_pin" />
        ) : null}
      </Box>

      <Text variant="subheading" marginTop="s">
        {announcement.title}
      </Text>
      <Text variant="body" marginTop="xs">
        {announcement.content}
      </Text>

      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        marginTop="m"
        paddingTop="m"
        borderTopWidth={1}
        borderTopColor="border"
      >
        <Icon name="person" size={14} color={theme.colors.ink300} />
        <Text variant="caption" flex={1} numberOfLines={1}>
          {announcement.posterName ?? "KIZ Office"}
        </Text>
        <Text variant="caption">{formatMalaysia(new Date(announcement.createdAt))}</Text>
      </Box>
    </Surface>
  )
}

export default function AnnouncementsScreen() {
  const theme = useTheme()
  const { data, isLoading, isError, refetch, isRefetching } = useAnnouncements()
  const announcements = data?.announcements ?? []

  return (
    <Screen scroll edges={["top"]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <PageHeader title="Announcements" subtitle="Updates from the KIZ office" />

      {isLoading ? (
        <Box paddingVertical="xxl" alignItems="center">
          <ActivityIndicator color={theme.colors.brand600} />
        </Box>
      ) : isError ? (
        <KEmpty
          icon="error_outline"
          title="Couldn't load announcements"
          message="Pull down to try again."
        />
      ) : announcements.length === 0 ? (
        <KEmpty title="No announcements yet" message="Check back soon." />
      ) : (
        <Box gap="m">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </Box>
      )}

      <Box height={32} />
    </Screen>
  )
}

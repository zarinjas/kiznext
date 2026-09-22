import { ANNOUNCEMENT_REACTIONS, announcementTagMeta, formatMalaysia } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import { useAnnouncements, useMarkAnnouncementRead, useToggleAnnouncementReaction } from "@/lib/hooks"
import type { Announcement } from "@/lib/types"
import {
  Box,
  KButton,
  KEmpty,
  PageHeader,
  Screen,
  StatusChip,
  Text,
  type ChipTone,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

const MEMBER_ROLES = ["ahli", "staf", "fellow"]

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

export default function AnnouncementsScreen() {
  const theme = useTheme()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isRefetching } = useAnnouncements()
  const [openId, setOpenId] = useState<string | null>(null)

  const announcements = data?.announcements ?? []
  const canInteract = Boolean(user && MEMBER_ROLES.includes(user.role))
  const open = announcements.find((a) => a.id === openId) ?? null

  return (
    <Screen scroll edges={["top"]} refreshing={isRefetching} onRefresh={() => refetch()}>
      <PageHeader title="Announcements" subtitle="Stay updated with the latest news and notices from KIZ." />

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
            <AnnouncementCard
              key={a.id}
              announcement={a}
              canInteract={canInteract}
              onOpen={() => setOpenId(a.id)}
            />
          ))}
        </Box>
      )}

      <Box height={32} />

      <AnnouncementDialog
        announcement={open}
        canInteract={canInteract}
        onClose={() => setOpenId(null)}
      />
    </Screen>
  )
}

function tagAccent(tag: string): keyof Theme["colors"] {
  switch (tag) {
    case "important":
      return "danger"
    case "event":
      return "info"
    case "sports":
      return "success"
    default:
      return "brand600"
  }
}

function AnnouncementCard({
  announcement,
  canInteract,
  onOpen,
}: {
  announcement: Announcement
  canInteract: boolean
  onOpen: () => void
}) {
  const theme = useTheme<Theme>()
  const meta = announcementTagMeta(announcement.tag)
  const accent = tagAccent(announcement.tag)

  return (
    <Pressable onPress={onOpen}>
      <Box
        borderRadius="cardLg"
        borderWidth={1}
        borderColor="border"
        borderLeftWidth={4}
        borderLeftColor={accent}
        backgroundColor="surface"
        padding="l"
        overflow="hidden"
      >
        <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
          <StatusChip label={meta.label} tone={toneForTag(announcement.tag)} icon={meta.icon} />
          {announcement.isPinned ? (
            <StatusChip label="Pinned" tone="warning" icon="push_pin" />
          ) : null}
          {announcement.unread ? <StatusChip label="New" tone="success" /> : null}
        </Box>

        <Text variant="subheading" marginTop="s">
          {announcement.title}
        </Text>
        <Text variant="body" marginTop="xs" numberOfLines={3}>
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

        {canInteract ? (
          <Box marginTop="m">
            <ReactionRow announcement={announcement} compact />
          </Box>
        ) : null}
      </Box>
    </Pressable>
  )
}

function ReactionRow({ announcement, compact = false }: { announcement: Announcement; compact?: boolean }) {
  const theme = useTheme()
  const toggle = useToggleAnnouncementReaction()

  return (
    <Box flexDirection="row" flexWrap="wrap" gap="s">
      {ANNOUNCEMENT_REACTIONS.map((r) => {
        const active = announcement.mine.includes(r.type)
        const count = announcement.reactions[r.type]
        return (
          <Pressable
            key={r.type}
            disabled={toggle.isPending}
            onPress={(e) => {
              e.stopPropagation?.()
              toggle.mutate({ id: announcement.id, type: r.type })
            }}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="xs"
              paddingHorizontal="s"
              paddingVertical="xs"
              borderRadius="pill"
              borderWidth={1}
              borderColor={active ? "brand300" : "border"}
              backgroundColor={active ? "brand50" : "transparent"}
            >
              <Text style={{ fontSize: compact ? 13 : 15, lineHeight: 18 }}>{r.emoji}</Text>
              {!compact ? (
                <Text
                  variant="caption"
                  style={{ color: active ? theme.colors.brand700 : theme.colors.ink500 }}
                >
                  {r.label}
                </Text>
              ) : null}
              {count > 0 ? (
                <Text
                  variant="caption"
                  style={{ color: active ? theme.colors.brand700 : theme.colors.ink500, fontWeight: "600" }}
                >
                  {count}
                </Text>
              ) : null}
            </Box>
          </Pressable>
        )
      })}
    </Box>
  )
}

function AnnouncementDialog({
  announcement,
  canInteract,
  onClose,
}: {
  announcement: Announcement | null
  canInteract: boolean
  onClose: () => void
}) {
  const theme = useTheme()
  const markRead = useMarkAnnouncementRead()
  const announcementId = announcement?.id
  const unread = announcement?.unread

  useEffect(() => {
    if (announcementId && unread) markRead.mutate(announcementId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId, unread])

  const meta = announcement ? announcementTagMeta(announcement.tag) : null
  const attachment = announcement ? absoluteUrl(announcement.attachmentUrl) : null
  const isImage = announcement?.attachmentType === "image"
  const isPdf = announcement?.attachmentType === "pdf"

  return (
    <Modal visible={Boolean(announcement)} animationType="slide" transparent onRequestClose={onClose}>
      <Box flex={1} justifyContent="flex-end">
        <Box
          backgroundColor="surface"
          borderTopLeftRadius="sheet"
          borderTopRightRadius="sheet"
          maxHeight="92%"
        >
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Box flexDirection="row" alignItems="center" justifyContent="space-between">
              <Text variant="heading">Announcement</Text>
              <Pressable onPress={onClose}>
                <Text variant="caption">Close</Text>
              </Pressable>
            </Box>

            {announcement && meta ? (
              <Box gap="m" marginTop="l">
                <Box flexDirection="row" alignItems="center" gap="s" flexWrap="wrap">
                  <StatusChip label={meta.label} tone={toneForTag(announcement.tag)} icon={meta.icon} />
                  {announcement.isPinned ? (
                    <StatusChip label="Pinned" tone="warning" icon="push_pin" />
                  ) : null}
                </Box>

                <Text variant="title">{announcement.title}</Text>
                <Text variant="caption">
                  {announcement.posterName ?? "KIZ Office"} ·{" "}
                  {formatMalaysia(new Date(announcement.createdAt))}
                </Text>

                <Text variant="body">{announcement.content}</Text>

                {attachment && isImage ? (
                  <Image
                    source={{ uri: attachment }}
                    style={{ width: "100%", height: 220, borderRadius: theme.borderRadii.card }}
                    contentFit="cover"
                  />
                ) : null}

                {attachment && isPdf ? (
                  <KButton
                    label="Open PDF"
                    variant="secondary"
                    icon="attachment"
                    onPress={() =>
                      router.push({
                        pathname: "/pdf-viewer",
                        params: { url: attachment, title: announcement.title },
                      })
                    }
                  />
                ) : null}

                {attachment && !isImage && !isPdf ? (
                  <KButton
                    label="Open attachment"
                    variant="secondary"
                    icon="open_in_new"
                    onPress={() =>
                      router.push({
                        pathname: "/pdf-viewer",
                        params: { url: attachment, title: announcement.title },
                      })
                    }
                  />
                ) : null}

                {canInteract ? (
                  <Box paddingTop="m" borderTopWidth={1} borderTopColor="border">
                    <Text variant="label" marginBottom="s">
                      REACTIONS
                    </Text>
                    <ReactionRow announcement={announcement} />
                  </Box>
                ) : null}
              </Box>
            ) : null}
          </ScrollView>
        </Box>
      </Box>
    </Modal>
  )
}

import { ANNOUNCEMENT_REACTIONS, announcementTagMeta, formatMalaysia } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable, ScrollView } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import { useAnnouncements, useMarkAnnouncementRead, useToggleAnnouncementReaction } from "@/lib/hooks"
import type { Announcement } from "@/lib/types"
import {
  AsyncBoundary,
  Box,
  FadeInUp,
  FullScreenModal,
  KButton,
  KEmpty,
  PageHeader,
  PressScale,
  Screen,
  Skeleton,
  SplitView,
  StatusChip,
  Text,
  useToast,
  useSplitView,
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
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isRefetching } = useAnnouncements()
  const [openId, setOpenId] = useState<string | null>(null)
  const { isSplit } = useSplitView()

  const announcements = data?.announcements ?? []
  const canInteract = Boolean(user && MEMBER_ROLES.includes(user.role))
  const open = announcements.find((a) => a.id === openId) ?? null

  const header = (
    <>
      {/* Header stays mounted through load and error so the page never blanks. */}
      <PageHeader
        title="Announcements"
        subtitle="Stay updated with the latest news and notices from KIZ."
      />

      <AsyncBoundary
        data={data}
        isLoading={isLoading}
        isError={isError}
        refetch={() => refetch()}
        skeleton={<Skeleton.Feed count={3} />}
        errorTitle="Couldn't load announcements"
        errorMessage="Check your connection and try again."
      >
        {(loaded) => {
          const list = loaded.announcements ?? []

          if (list.length === 0) {
            return <KEmpty title="No announcements yet" message="Check back soon." />
          }

          return (
            <Box gap="m">
              {list.map((a, i) => (
                // Cap the stagger so the tail of a long feed isn't left waiting.
                <FadeInUp key={a.id} index={Math.min(i, 6)}>
                  <AnnouncementCard
                    announcement={a}
                    canInteract={canInteract}
                    selected={isSplit && a.id === openId}
                    onOpen={() => setOpenId(a.id)}
                  />
                </FadeInUp>
              ))}
            </Box>
          )
        }}
      </AsyncBoundary>
    </>
  )

  // Tablet landscape: list beside detail, so reading doesn't lose the feed.
  // Phone / portrait tablet: unchanged single-column flow with a full-screen
  // reader, which is the right shape for a narrow screen.
  if (isSplit) {
    return (
      <Screen padded={false} edges={["top"]} refreshing={isRefetching} onRefresh={() => refetch()}>
        <SplitView
          placeholderTitle="Pick an announcement"
          placeholderMessage="Tap a notice on the left to read it here."
          placeholderIcon="campaign"
          list={
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              {header}
            </ScrollView>
          }
          detail={
            open ? (
              <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                <AnnouncementBody announcement={open} canInteract={canInteract} />
              </ScrollView>
            ) : null
          }
        />
      </Screen>
    )
  }

  return (
    <Screen scroll edges={["top"]} refreshing={isRefetching} onRefresh={() => refetch()}>
      {header}

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
  selected = false,
  onOpen,
}: {
  announcement: Announcement
  canInteract: boolean
  /** Highlighted in the tablet split view when it's the open item. */
  selected?: boolean
  onOpen: () => void
}) {
  const theme = useTheme<Theme>()
  const meta = announcementTagMeta(announcement.tag)
  const accent = tagAccent(announcement.tag)

  return (
    <PressScale
      onPress={onOpen}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${meta.label}: ${announcement.title}`}
    >
      <Box
        borderRadius="cardLg"
        borderWidth={1}
        borderColor={selected ? "brand600" : "border"}
        backgroundColor={selected ? "brand50" : "surface"}
        borderLeftWidth={4}
        borderLeftColor={accent}
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
    </PressScale>
  )
}

function ReactionRow({ announcement, compact = false }: { announcement: Announcement; compact?: boolean }) {
  const theme = useTheme<Theme>()
  const toast = useToast()
  const toggle = useToggleAnnouncementReaction()

  return (
    <Box flexDirection="row" flexWrap="wrap" gap="s">
      {ANNOUNCEMENT_REACTIONS.map((r) => {
        const active = announcement.mine.includes(r.type)
        const count = announcement.reactions[r.type]
        return (
          // The pill stays visually small; `hitSlop` lifts the touch target to
          // 44pt+ without turning a reaction row into a row of buttons.
          <Pressable
            key={r.type}
            disabled={toggle.isPending}
            accessibilityRole="button"
            accessibilityLabel={`${r.label}${count > 0 ? `, ${count}` : ""}`}
            accessibilityState={{ selected: active, disabled: toggle.isPending }}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            onPress={(e) => {
              e.stopPropagation?.()
              toggle.mutate(
                { id: announcement.id, type: r.type },
                { onError: () => toast.error("Couldn't save your reaction.") }
              )
            }}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              gap="xs"
              minHeight={compact ? 28 : 32}
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
  return (
    // Full-screen rather than a sheet: announcements run long, and a 92%-tall
    // sheet left the body scrolling in a letterbox.
    <FullScreenModal visible={Boolean(announcement)} onClose={onClose} title="Announcement">
      {announcement ? (
        <AnnouncementBody announcement={announcement} canInteract={canInteract} />
      ) : null}
    </FullScreenModal>
  )
}

/**
 * The announcement detail body, shared by the phone modal and the tablet detail
 * pane so the two can never drift.
 */
function AnnouncementBody({
  announcement,
  canInteract,
}: {
  announcement: Announcement
  canInteract: boolean
}) {
  const theme = useTheme<Theme>()
  const meta = announcementTagMeta(announcement.tag)
  const attachment = absoluteUrl(announcement.attachmentUrl)
  const isImage = announcement.attachmentType === "image"
  const isPdf = announcement.attachmentType === "pdf"

  // Mark-read lives here rather than in the dialog, so it fires for both the
  // phone modal and the tablet detail pane.
  const markRead = useMarkAnnouncementRead()
  const announcementId = announcement.id
  const unread = announcement.unread

  useEffect(() => {
    if (announcementId && unread) markRead.mutate(announcementId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcementId, unread])

  return (
        <Box gap="m">
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
            // `contain` + a width cap: a full-bleed 220pt-tall crop stretched
            // and distorted the image on an iPad.
            <Image
              source={{ uri: attachment }}
              style={{
                width: "100%",
                maxWidth: 560,
                alignSelf: "center",
                height: 220,
                borderRadius: theme.borderRadii.card,
                backgroundColor: theme.colors.canvasSunk,
              }}
              contentFit="contain"
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
  )
}

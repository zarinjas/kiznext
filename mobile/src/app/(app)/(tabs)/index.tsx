import { ROLE_LABELS, ROLE_OVERLINES, announcementTagMeta, ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { Image } from "expo-image"
import { router, type Href } from "expo-router"
import { Linking, Pressable } from "react-native"

import { GradientBg, HERO_GRADIENT } from "@/components/gradient"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL, absoluteUrl } from "@/lib/config"
import { useHome } from "@/lib/hooks"
import type { ResidentHome } from "@/lib/types"
import {
  Box,
  ListGroup,
  ListRow,
  LoadingScreen,
  Screen,
  StatusChip,
  Surface,
  Text,
  type ChipTone,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

const LOGO_URL = `${API_BASE_URL}/api/app-icon`

function todoHref(id: string): Href | null {
  if (id === "announcement") return "/pengumuman"
  if (id === "ecard") return "/kad-maya"
  if (id === "room") return "/bilik"
  return null
}

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

type ActionTone = "brand" | "accent" | "danger" | "info"

const ACTION_TONES: Record<ActionTone, { bg: keyof Theme["colors"]; fg: keyof Theme["colors"] }> = {
  brand: { bg: "brand50", fg: "brand700" },
  accent: { bg: "accent50", fg: "accent600" },
  danger: { bg: "dangerSoft", fg: "dangerInk" },
  info: { bg: "infoSoft", fg: "infoInk" },
}

const QUICK_ACTIONS: { icon: string; label: string; tone: ActionTone; path: Href }[] = [
  { icon: "view_in_ar", label: "AR Directory", tone: "accent", path: "/direktori" },
  { icon: "sos", label: "SOS", tone: "danger", path: "/sos" },
  { icon: "translate", label: "Translate", tone: "info", path: "/ar-terjemah" },
  { icon: "local_laundry_service", label: "Laundry", tone: "brand", path: "/laundry" },
]

function QuickAction({ action }: { action: (typeof QUICK_ACTIONS)[number] }) {
  const theme = useTheme<Theme>()
  const t = ACTION_TONES[action.tone]
  return (
    <Pressable onPress={() => router.push(action.path)} style={{ flex: 1 }}>
      <Box alignItems="center" gap="xs">
        <Box
          width={54}
          height={54}
          borderRadius="card"
          backgroundColor={t.bg}
          alignItems="center"
          justifyContent="center"
        >
          <Icon name={action.icon} size={24} color={theme.colors[t.fg]} />
        </Box>
        <Text variant="caption" textAlign="center" style={{ color: theme.colors.ink700 }}>
          {action.label}
        </Text>
      </Box>
    </Pressable>
  )
}

function ThingsToDo({ home }: { home: ResidentHome }) {
  const theme = useTheme()
  const total = home.todos.length
  const pct = total > 0 ? Math.round((home.doneCount / total) * 100) : 0
  const allDone = total > 0 && home.doneCount === total

  if (total === 0) return null

  return (
    <Surface>
      <Box flexDirection="row" alignItems="center" justifyContent="space-between">
        <Text variant="bodyStrong">Things to do</Text>
        <Text variant="caption">
          {home.doneCount} of {total} done
        </Text>
      </Box>

      <Box height={8} borderRadius="pill" backgroundColor="canvasSunk" marginTop="m" overflow="hidden">
        <Box height={8} borderRadius="pill" backgroundColor="brand600" width={`${pct}%`} />
      </Box>

      {allDone ? (
        <Box flexDirection="row" alignItems="center" gap="s" marginTop="m">
          <Icon name="check_circle" size={18} color={theme.colors.success} />
          <Text variant="caption" style={{ color: theme.colors.successInk }}>
            You&apos;re all caught up.
          </Text>
        </Box>
      ) : (
        <Box marginTop="s">
          {home.todos
            .filter((t) => !t.done)
            .map((todo) => {
              const href = todoHref(todo.id)
              return (
                <ListRow
                  key={todo.id}
                  title={todo.title}
                  subtitle={todo.subtitle ?? todo.dueLabel ?? undefined}
                  chevron={Boolean(href)}
                  onPress={href ? () => router.push(href) : undefined}
                  trailing={
                    href ? (
                      <StatusChip label={todo.ctaLabel} tone="brand" />
                    ) : (
                      <StatusChip label="Soon" tone="neutral" />
                    )
                  }
                />
              )
            })}
        </Box>
      )}
    </Surface>
  )
}

function PinnedCard({ a }: { a: ResidentHome["pinnedAnnouncements"][number] }) {
  const theme = useTheme<Theme>()
  const meta = announcementTagMeta(a.tag)
  return (
    <Pressable onPress={() => router.push("/pengumuman")}>
      <Surface>
        <Box flexDirection="row" gap="m" alignItems="flex-start">
          <Box
            width={44}
            height={44}
            borderRadius="card"
            backgroundColor={toneForTag(a.tag) === "danger" ? "dangerSoft" : toneForTag(a.tag) === "info" ? "infoSoft" : "brand50"}
            alignItems="center"
            justifyContent="center"
          >
            <Icon
              name={meta.icon}
              size={22}
              color={
                toneForTag(a.tag) === "danger"
                  ? theme.colors.dangerInk
                  : toneForTag(a.tag) === "info"
                    ? theme.colors.infoInk
                    : theme.colors.brand700
              }
            />
          </Box>

          <Box flex={1} minWidth={0}>
            <Box flexDirection="row" alignItems="center" gap="s">
              <StatusChip label={meta.label} tone={toneForTag(a.tag)} />
              <Icon name="push_pin" size={14} color={theme.colors.ink300} />
            </Box>
            <Text variant="bodyStrong" marginTop="s" numberOfLines={2}>
              {a.title}
            </Text>
            <Text variant="caption" marginTop="xs" numberOfLines={2}>
              {a.content}
            </Text>
            <Text variant="caption" marginTop="s" style={{ color: theme.colors.ink300 }}>
              {a.when}
            </Text>
          </Box>
        </Box>
      </Surface>
    </Pressable>
  )
}

export default function DashboardScreen() {
  const theme = useTheme<Theme>()
  const { user } = useAuth()
  const { data, isLoading } = useHome()

  if (!user) return null
  if (isLoading) return <LoadingScreen label="Loading your dashboard…" />

  const home = data?.home ?? null
  const firstName = user.name.split(" ")[0] || user.name
  const avatar = absoluteUrl(user.avatarUrl)

  return (
    <Screen scroll edges={["top"]}>
      {/* Header */}
      <Box flexDirection="row" alignItems="center" gap="m" paddingTop="m">
        <Box
          width={44}
          height={44}
          borderRadius="card"
          backgroundColor="surface"
          borderWidth={1}
          borderColor="border"
          alignItems="center"
          justifyContent="center"
          overflow="hidden"
        >
          <Image source={{ uri: LOGO_URL }} style={{ width: 34, height: 34 }} contentFit="contain" />
        </Box>

        <Box flex={1} minWidth={0}>
          <Text variant="caption" style={{ color: theme.colors.ink500 }}>
            {ROLE_OVERLINES[user.role]}
          </Text>
          <Text variant="heading" numberOfLines={1}>
            Hi, {firstName}
          </Text>
        </Box>

        <Pressable onPress={() => router.push("/profile")}>
          <Box
            width={44}
            height={44}
            borderRadius="pill"
            backgroundColor="brand50"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 44, height: 44 }} contentFit="cover" />
            ) : (
              <Text variant="subheading" style={{ color: theme.colors.brand700 }}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </Box>
        </Pressable>
      </Box>

      {/* Quick actions */}
      <Box flexDirection="row" gap="s" marginTop="l">
        {QUICK_ACTIONS.map((a) => (
          <QuickAction key={a.label} action={a} />
        ))}
      </Box>

      {/* Hero — room placement */}
      <Box marginTop="l" borderRadius="cardLg" overflow="hidden">
        <GradientBg id="hero" colors={HERO_GRADIENT} />
        <Box padding="l" gap="s">
          {home?.room ? (
            <>
              <Box flexDirection="row" alignItems="center" gap="s">
                <Box
                  paddingHorizontal="s"
                  paddingVertical="xs"
                  borderRadius="pill"
                  style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
                >
                  <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    Your room
                  </Text>
                </Box>
              </Box>
              <Text variant="title" style={{ color: "#FFFFFF" }}>
                {home.room.roomCode}
              </Text>
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.92)" }}>
                {home.room.session ? `Residential Session ${home.room.session}` : ""}
              </Text>
              {home.room.roommateName ? (
                <Text variant="caption" style={{ color: "rgba(255,255,255,0.92)" }}>
                  Roommate: {home.room.roommateName}
                  {home.room.roommateMatricId ? ` (${home.room.roommateMatricId})` : ""}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.92)" }}>
                {ROLE_LABELS[user.role]}
              </Text>
              <Text variant="title" style={{ color: "#FFFFFF" }}>
                {user.name}
              </Text>
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.92)" }}>
                {user.matricId}
                {user.email ? ` · ${user.email}` : ""}
              </Text>
            </>
          )}
        </Box>
      </Box>

      {home ? (
        <>
          <Box height={20} />
          <ThingsToDo home={home} />

          {home.pinnedAnnouncements.length > 0 ? (
            <>
              <Box height={20} />
              <Box flexDirection="row" alignItems="center" justifyContent="space-between" marginBottom="s">
                <Text variant="label">PINNED</Text>
                <Pressable onPress={() => router.push("/pengumuman")}>
                  <Text variant="caption" style={{ color: theme.colors.brand700, fontWeight: "600" }}>
                    See all
                  </Text>
                </Pressable>
              </Box>
              <Box gap="m">
                {home.pinnedAnnouncements.map((a) => (
                  <PinnedCard key={a.id} a={a} />
                ))}
              </Box>
            </>
          ) : null}

          {home.importantNotice ? (
            <>
              <Box height={20} />
              <Surface>
                <Box flexDirection="row" gap="m" alignItems="flex-start">
                  <Box
                    width={44}
                    height={44}
                    borderRadius="card"
                    backgroundColor="dangerSoft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon name="notification_important" size={22} color={theme.colors.dangerInk} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <StatusChip label="Important" tone="danger" />
                    <Text variant="bodyStrong" marginTop="s">
                      {home.importantNotice.title}
                    </Text>
                    <Text variant="caption" marginTop="xs" numberOfLines={3}>
                      {home.importantNotice.content}
                    </Text>
                  </Box>
                </Box>
              </Surface>
            </>
          ) : null}

          {home.nextEvents.length > 0 ? (
            <>
              <Box height={20} />
              <Text variant="label" marginBottom="s" marginLeft="xs">
                UPCOMING AT KIZ
              </Text>
              <ListGroup>
                {home.nextEvents.map((e) => (
                  <ListRow
                    key={e.id}
                    icon="event"
                    title={e.title}
                    subtitle={e.venue ?? e.description ?? undefined}
                    meta={e.when}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}

          {home.helpdesk ? (
            <>
              <Box height={20} />
              <ListGroup title="My helpdesk request">
                <ListRow
                  icon="support_agent"
                  title={`${ticketRef(home.helpdesk.displayId)} · ${home.helpdesk.subject}`}
                  subtitle={home.helpdesk.updatedWhen}
                  onPress={() => router.push("/helpdesk")}
                  trailing={<StatusChip label="View" tone="brand" />}
                />
              </ListGroup>
            </>
          ) : null}

          {home.emergencyContacts.length > 0 ? (
            <>
              <Box height={20} />
              <ListGroup title="Emergency contacts">
                {home.emergencyContacts.map((c) => (
                  <ListRow key={c.id} icon="security" title={c.title} meta={c.phone ?? undefined} />
                ))}
              </ListGroup>
            </>
          ) : null}

          {home.stayConnected?.enabled && home.stayConnected.links.length > 0 ? (
            <>
              <Box height={20} />
              <ListGroup title={home.stayConnected.title}>
                {home.stayConnected.links
                  .filter((l) => l.isActive)
                  .map((l) => (
                    <ListRow
                      key={l.id}
                      icon={l.icon || "link"}
                      title={l.label}
                      subtitle={l.description ?? undefined}
                      onPress={() => Linking.openURL(l.url).catch(() => {})}
                    />
                  ))}
              </ListGroup>
            </>
          ) : null}
        </>
      ) : null}

      <Box height={32} />
    </Screen>
  )
}

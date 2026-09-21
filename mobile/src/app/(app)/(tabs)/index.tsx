import { ROLE_LABELS, ROLE_OVERLINES, ticketRef } from "@kiz/shared"
import { useTheme } from "@shopify/restyle"
import { router, type Href } from "expo-router"
import { Linking } from "react-native"

import { useAuth } from "@/lib/auth-context"
import { useHome } from "@/lib/hooks"
import type { ResidentHome } from "@/lib/types"
import {
  Box,
  HeroPanel,
  ListGroup,
  ListRow,
  LoadingScreen,
  PageHeader,
  Screen,
  StatusChip,
  Surface,
  Text,
} from "@/ui"
import { Icon } from "@/ui/icon"

function todoHref(id: string): Href | null {
  if (id === "announcement") return "/pengumuman"
  if (id === "ecard") return "/kad-maya"
  if (id === "room") return "/bilik"
  return null
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

export default function DashboardScreen() {
  const { user } = useAuth()
  const { data, isLoading } = useHome()

  if (!user) return null
  if (isLoading) return <LoadingScreen label="Loading your dashboard…" />

  const home = data?.home ?? null
  const firstName = user.name.split(" ")[0] || user.name

  return (
    <Screen scroll edges={["top"]}>
      <PageHeader title={`Hi, ${firstName}`} subtitle={ROLE_OVERLINES[user.role]} />

      {home?.room ? (
        <HeroPanel>
          <StatusChip label="Your room" tone="brand" icon="bedroom_parent" />
          <Box height={12} />
          <Text variant="heading">{home.room.roomCode}</Text>
          {home.room.session ? (
            <Text variant="caption" marginTop="xs">
              Residential Session {home.room.session}
            </Text>
          ) : null}
          {home.room.roommateName ? (
            <Text variant="caption" marginTop="xs">
              Roommate: {home.room.roommateName}
              {home.room.roommateMatricId ? ` (${home.room.roommateMatricId})` : ""}
            </Text>
          ) : null}
        </HeroPanel>
      ) : (
        <HeroPanel>
          <StatusChip label={ROLE_LABELS[user.role]} tone="brand" icon="badge" />
          <Box height={12} />
          <Text variant="heading">{user.name}</Text>
          <Text variant="caption">
            {user.matricId}
            {user.email ? ` · ${user.email}` : ""}
          </Text>
        </HeroPanel>
      )}

      {home ? (
        <>
          <Box height={24} />
          <ThingsToDo home={home} />

          {home.pinnedAnnouncements.length > 0 ? (
            <>
              <Box height={24} />
              <Text variant="label" marginBottom="s" marginLeft="xs">
                PINNED
              </Text>
              <Box gap="m">
                {home.pinnedAnnouncements.map((a) => (
                  <Surface key={a.id}>
                    <Text variant="subheading">{a.title}</Text>
                    <Text variant="caption" marginTop="xs" numberOfLines={3}>
                      {a.content}
                    </Text>
                    <Text variant="caption" marginTop="s">
                      {a.when}
                    </Text>
                  </Surface>
                ))}
              </Box>
            </>
          ) : null}

          {home.importantNotice ? (
            <>
              <Box height={24} />
              <Surface>
                <StatusChip label="Important" tone="danger" icon="notification_important" />
                <Text variant="subheading" marginTop="s">
                  {home.importantNotice.title}
                </Text>
                <Text variant="caption" marginTop="xs" numberOfLines={3}>
                  {home.importantNotice.content}
                </Text>
              </Surface>
            </>
          ) : null}

          {home.nextEvents.length > 0 ? (
            <>
              <Box height={24} />
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
              <Box height={24} />
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
              <Box height={24} />
              <ListGroup title="Emergency contacts">
                {home.emergencyContacts.map((c) => (
                  <ListRow key={c.id} icon="security" title={c.title} meta={c.phone ?? undefined} />
                ))}
              </ListGroup>
            </>
          ) : null}

          {home.stayConnected?.enabled && home.stayConnected.links.length > 0 ? (
            <>
              <Box height={24} />
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

      <Box height={24} />

      <ListGroup title="Quick links">
        <ListRow
          icon="campaign"
          title="Announcements"
          subtitle="Latest from the KIZ office"
          onPress={() => router.push("/pengumuman")}
        />
        <ListRow
          icon="forum"
          title="Community chat"
          subtitle="Talk to other residents"
          onPress={() => router.push("/chat")}
        />
        <ListRow
          icon="qr_code_2"
          title="Digital Resident ID"
          subtitle="Your digital resident card"
          onPress={() => router.push("/kad-maya")}
        />
        <ListRow
          icon="widgets"
          title="All modules"
          subtitle="Everything else KIZ has to offer"
          onPress={() => router.push("/lagi")}
        />
      </ListGroup>

      <Box height={32} />
    </Screen>
  )
}

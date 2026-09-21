import { router, type Href } from "expo-router"

import { useAuth } from "@/lib/auth-context"
import { navForRole } from "@/lib/nav"
import { Box, ListGroup, ListRow, PageHeader, Screen, StatusChip } from "@/ui"

export default function MoreScreen() {
  const { user } = useAuth()
  if (!user) return null

  const groups = navForRole(user.role)

  return (
    <Screen scroll edges={["top"]}>
      <PageHeader title="More" subtitle="Every KIZ module, at a glance" />

      <Box gap="xl">
        {groups.map((group) => (
          <ListGroup key={group.label} title={group.label}>
            {group.items.map((item) => {
              const built = item.path !== null
              return (
                <ListRow
                  key={`${group.label}-${item.label}`}
                  icon={item.icon}
                  title={item.label}
                  onPress={
                    built
                      ? () => router.push((item.path === "" ? "/" : `/${item.path}`) as Href)
                      : undefined
                  }
                  chevron={built}
                  trailing={built ? undefined : <StatusChip label="Soon" tone="neutral" />}
                />
              )
            })}
          </ListGroup>
        ))}
      </Box>

      <Box height={32} />
    </Screen>
  )
}

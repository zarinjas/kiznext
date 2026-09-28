import { useMemo, useState } from "react"
import { router, type Href } from "expo-router"

import { useAuth } from "@/lib/auth-context"
import { navForRole, type NavGroup } from "@/lib/nav"
import {
  AiBadge,
  Box,
  FadeInUp,
  KEmpty,
  ListGroup,
  ListRow,
  PageHeader,
  Screen,
  StatusChip,
} from "@/ui"

/**
 * The "More" menu — every module the signed-in role can reach.
 *
 * Two structural changes:
 *
 * 1. **Unbuilt modules are collapsed.** 13 admin routes have no mobile screen
 *    yet and were rendered inline as greyed "Soon" rows, so a third of this
 *    screen advertised incompleteness. They now sit behind one tappable
 *    "Coming soon" row — parity gaps stay visible to us without dominating the
 *    menu.
 * 2. **AI & AR is first** and carries a badge, so the flagship features are the
 *    first thing seen rather than rows 6–7 of "Support".
 */
export default function MoreScreen() {
  const { user } = useAuth()
  const [showSoon, setShowSoon] = useState(false)

  const { built, soon } = useMemo(() => {
    if (!user) return { built: [] as NavGroup[], soon: [] as NavGroup[] }
    const groups = navForRole(user.role)
    const builtGroups: NavGroup[] = []
    const soonGroups: NavGroup[] = []

    for (const group of groups) {
      const b = group.items.filter((i) => i.path !== null)
      const s = group.items.filter((i) => i.path === null)
      if (b.length) builtGroups.push({ ...group, items: b })
      if (s.length) soonGroups.push({ ...group, items: s })
    }
    return { built: builtGroups, soon: soonGroups }
  }, [user])

  if (!user) return null

  const soonCount = soon.reduce((n, g) => n + g.items.length, 0)

  return (
    <Screen scroll edges={["top"]}>
      <PageHeader title="More" subtitle="Every KIZ module, at a glance" />

      <Box gap="xl">
        {built.map((group, gi) => (
          <FadeInUp key={group.label} index={Math.min(gi, 5)}>
            <ListGroup
              title={group.label}
              titleAccessory={group.label === "AI & AR" ? <AiBadge label="POWERED" /> : undefined}
            >
              {group.items.map((item) => (
                <ListRow
                  key={`${group.label}-${item.label}`}
                  icon={item.icon}
                  title={item.label}
                  onPress={() => router.push((item.path === "" ? "/" : `/${item.path}`) as Href)}
                  chevron
                />
              ))}
            </ListGroup>
          </FadeInUp>
        ))}

        {soonCount > 0 ? (
          <Box gap="s">
            <ListGroup>
              <ListRow
                icon="widgets"
                title={showSoon ? "Hide upcoming modules" : `${soonCount} more modules coming soon`}
                subtitle={showSoon ? undefined : "Manage these on the KIZ web app for now"}
                onPress={() => setShowSoon((v) => !v)}
                chevron={false}
                trailing={<StatusChip label={showSoon ? "Hide" : "Show"} tone="neutral" />}
              />
            </ListGroup>

            {showSoon
              ? soon.map((group) => (
                  <FadeInUp key={`soon-${group.label}`}>
                    <ListGroup title={group.label}>
                      {group.items.map((item) => (
                        <ListRow
                          key={`soon-${group.label}-${item.label}`}
                          icon={item.icon}
                          title={item.label}
                          chevron={false}
                          trailing={<StatusChip label="Soon" tone="neutral" />}
                        />
                      ))}
                    </ListGroup>
                  </FadeInUp>
                ))
              : null}
          </Box>
        ) : null}

        {built.length === 0 ? (
          <KEmpty
            icon="widgets"
            title="Nothing available yet"
            message="Your role doesn't have any mobile modules assigned."
          />
        ) : null}
      </Box>

      <Box height={32} />
    </Screen>
  )
}

import {
  COLLEGE_NAME,
  color,
  elevation,
  gradientStops,
  moduleTint,
  formatWallClockTime,
  nowHhmmMalaysia,
} from "@kiz/shared"
import { Image } from "expo-image"
import { router, useFocusEffect, type Href } from "expo-router"
import { useTheme } from "@shopify/restyle"
import { useCallback } from "react"
import { Linking, StyleSheet, View } from "react-native"

import { AppLogo } from "@/components/app-logo"
import { GradientBg } from "@/components/gradient"
import { useAuth } from "@/lib/auth-context"
import { absoluteUrl } from "@/lib/config"
import { useDemo } from "@/lib/demo"
import { useConciergeMeta, useHome } from "@/lib/hooks"
import { useLayout } from "@/lib/responsive"
import type { HeroOverlay, HomeTodo, ResidentHome, ShowcaseBackgrounds } from "@/lib/types"
import {
  AiBadge,
  FadeInUp,
  LiveDot,
  PressScale,
  Pulse,
  Screen,
  Skeleton,
  Text,
  type Theme,
} from "@/ui"
import { Icon } from "@/ui/icon"

/** Matches the server default — used only before the first `/home` resolves. */
const DEFAULT_OVERLAY: HeroOverlay = { from: "#02141F", to: "#02141F", opacity: 0.55 }

/**
 * The three flagship AI/AR surfaces, promoted out of the utility grid.
 *
 * These were previously three of eight identical 56px circles, indistinguishable
 * from "Laundry" — which meant the work most worth showing was the work least
 * likely to be found. They now get their own titled section above Quick Access,
 * with large cards, gradient treatment and an explicit AI/AR badge.
 */
const SHOWCASE = [
  {
    key: "lens",
    label: "KIZ Lens",
    tagline: "Point at any sign — read it in your language",
    icon: "translate",
    path: "/ar-terjemah" as Href,
    gradient: gradientStops.lens,
    badge: "AI VISION",
  },
  {
    key: "wayfinder",
    label: "AR Wayfinder",
    tagline: "Follow a live arrow to any block",
    icon: "view_in_ar",
    path: "/direktori" as Href,
    gradient: gradientStops.wayfinder,
    badge: "LIVE AR",
  },
] as const

/** Secondary utilities. Ordered adaptively — see `orderedActions`. */
const QUICK_ACTIONS: {
  key: string
  label: string
  icon: string
  path: Href
  bg: string
  ink: string
}[] = [
  { key: "laundry", label: "Laundry", icon: "local_laundry_service", path: "/laundry", bg: moduleTint.laundry.bg, ink: moduleTint.laundry.ink },
  { key: "checkin", label: "Check-In/Out", icon: "how_to_reg", path: "/checkin", bg: moduleTint.checkin.bg, ink: moduleTint.checkin.ink },
  { key: "room", label: "Room Selection", icon: "bedroom_parent", path: "/bilik", bg: moduleTint.room.bg, ink: moduleTint.room.ink },
  { key: "facilities", label: "Facilities", icon: "meeting_room", path: "/tempahan-fasiliti", bg: moduleTint.facilities.bg, ink: moduleTint.facilities.ink },
  { key: "guide", label: "Digital Guide", icon: "menu_book", path: "/panduan", bg: moduleTint.guide.bg, ink: moduleTint.guide.ink },
  { key: "helpdesk", label: "Helpdesk", icon: "support_agent", path: "/helpdesk", bg: moduleTint.helpdesk.bg, ink: moduleTint.helpdesk.ink },
  { key: "lost", label: "Lost & Found", icon: "search", path: "/hilang", bg: moduleTint.lost.bg, ink: moduleTint.lost.ink },
  { key: "sos", label: "SOS", icon: "sos", path: "/sos", bg: moduleTint.sos.bg, ink: moduleTint.sos.ink },
]

function greeting(): string {
  // Greeting follows Malaysia time, not the device clock — an international
  // resident on a home timezone was being told "good evening" at 9am in KL.
  const hour = Number(nowHhmmMalaysia().slice(0, 2))
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

/**
 * Reorder the utility grid by what actually matters right now.
 *
 * Rule-based rather than model-based, and deliberately so: it is honest,
 * instant, and needs no network. A dashboard that visibly reacts to a running
 * laundry timer or an open room-selection window reads as attentive, where a
 * static hardcoded array reads as a feature list.
 */
function orderedActions(home: ResidentHome | null): typeof QUICK_ACTIONS {
  if (!home) return QUICK_ACTIONS

  const weight = (key: string): number => {
    if (key === "laundry" && home.laundry) return -100
    if (key === "room" && home.todos.some((t) => t.id === "room" && !t.done)) return -90
    if (key === "checkin" && !home.checkInStatus) return -80
    if (key === "helpdesk" && home.helpdesk) return -70
    // After 10pm local, put SOS within immediate reach.
    if (key === "sos" && Number(nowHhmmMalaysia().slice(0, 2)) >= 22) return -60
    return 0
  }

  return [...QUICK_ACTIONS].sort((a, b) => weight(a.key) - weight(b.key))
}

function todoHref(id: HomeTodo["id"]): Href {
  if (id === "announcement") return "/pengumuman"
  if (id === "ecard") return "/kad-maya"
  return "/bilik"
}

function HeaderButton({ icon, label, path }: { icon: string; label: string; path: Href }) {
  return (
    <PressScale
      onPress={() => router.push(path)}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerButton}
    >
      <Icon name={icon} size={20} color="#FFFFFF" />
    </PressScale>
  )
}

function Hero({
  backgroundUrl,
  overlay,
  home,
}: {
  backgroundUrl: string | null
  overlay: HeroOverlay
  home: ResidentHome | null
}) {
  const { user } = useAuth()
  const { demo } = useDemo()
  if (!user) return null
  const avatar = absoluteUrl(user.avatarUrl)
  const background = absoluteUrl(backgroundUrl)

  // Surface actionable state instead of the email the user already knows.
  const room = home?.room
  const roomLine = room
    ? `Block ${room.blockName} · Room ${room.roomNumber}${room.bed ? ` · ${room.bed}` : ""}`
    : null
  const hasTag = Boolean(home?.checkInStatus)

  // The hero is `justifyContent: space-between`, so a fixed height left a huge
  // dead gap when a fresh account had neither a room line nor a check-in tag.
  // A shorter variant keeps the two rows a comfortable, consistent distance
  // apart instead of stretching to fill 232pt.
  const compact = !roomLine || !hasTag

  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      {background ? (
        <Image source={{ uri: background }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
      ) : (
        <GradientBg id="mobile-home-hero" colors={[...gradientStops.hero]} />
      )}
      {/* Admin-configured overlay scrim — keeps the white text legible over any
          photo, defaulting to a near-black navy. */}
      <GradientBg
        id="mobile-home-hero-overlay"
        colors={[overlay.from, overlay.to]}
        opacity={overlay.opacity}
        direction="br"
      />
      <View style={styles.heroContent}>
        <View style={styles.heroTop}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <AppLogo size={31} />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>MyKIZ</Text>
              <Text numberOfLines={1} style={styles.collegeName}>{COLLEGE_NAME}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {demo ? <LiveDot label="DEMO" tone="onDark" /> : null}
            <HeaderButton icon="notifications" label="Notifications" path="/pengumuman" />
            <HeaderButton icon="settings" label="Profile and settings" path="/profile" />
          </View>
        </View>

        <View style={styles.identityRow}>
          <View style={styles.identityCopy}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text numberOfLines={2} style={styles.userName}>{user.name.trim()}</Text>
            <View style={styles.heroMetaRow}>
              <Text style={styles.matric}>{user.matricId}</Text>
              {home?.checkInStatus ? (
                <View style={styles.heroChip}>
                  <Icon name="how_to_reg" size={11} color="#FFFFFF" />
                  <Text style={styles.heroChipText}>{home.checkInStatus}</Text>
                </View>
              ) : null}
            </View>
            {roomLine ? (
              <Text numberOfLines={1} style={styles.roomLine}>{roomLine}</Text>
            ) : null}
          </View>
          <PressScale
            onPress={() => router.push("/profile")}
            scaleTo={0.93}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={styles.avatarRing}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </PressScale>
        </View>
      </View>
    </View>
  )
}

function SectionHeader({
  title,
  action,
  onPress,
  badge,
}: {
  title: string
  action?: string
  onPress?: () => void
  badge?: React.ReactNode
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge}
      </View>
      {action && onPress ? (
        <PressScale onPress={onPress} haptic={false} scaleTo={0.94}>
          <View style={styles.sectionActionHit}>
            <Text style={styles.sectionAction}>{action}</Text>
          </View>
        </PressScale>
      ) : null}
    </View>
  )
}

/** The promoted AI/AR block. */
function Showcase({
  backgrounds,
  aiName,
}: {
  backgrounds: ShowcaseBackgrounds
  aiName: string
}) {
  const { isTablet } = useLayout()

  return (
    <>
      <SectionHeader title="AI & AR at KIZ" badge={<AiBadge label="POWERED" />} />
      <View style={[styles.showcaseRow, isTablet && styles.showcaseRowWide]}>
        {SHOWCASE.map((item, i) => {
          const image = backgrounds[item.key] ? absoluteUrl(backgrounds[item.key]) : null
          return (
            <FadeInUp key={item.key} index={i} style={styles.showcaseFlex}>
              <Pulse enabled={i === 0}>
                <PressScale
                  onPress={() => router.push(item.path)}
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}. ${item.tagline}`}
                  style={styles.showcaseCard}
                >
                  {image ? (
                    <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                  ) : (
                    <GradientBg id={`sc-${item.key}`} colors={[...item.gradient]} direction="br" />
                  )}
                  {/* Legibility scrim over an admin-uploaded photo. */}
                  {image ? <View style={styles.showcaseScrim} /> : null}
                  <View style={styles.showcaseInner}>
                    <View style={styles.showcaseTop}>
                      <View style={styles.showcaseGlyph}>
                        <Icon name={item.icon} size={24} color="#FFFFFF" />
                      </View>
                      <View style={styles.showcaseBadge}>
                        <Icon name="auto_awesome" size={10} color="#FFFFFF" />
                        <Text style={styles.showcaseBadgeText}>{item.badge}</Text>
                      </View>
                    </View>
                    <View>
                      <Text style={styles.showcaseTitle}>{item.label}</Text>
                      <Text numberOfLines={2} style={styles.showcaseTagline}>{item.tagline}</Text>
                    </View>
                  </View>
                </PressScale>
              </Pulse>
            </FadeInUp>
          )
        })}
      </View>

      {/* KIZ-AI gets an input-shaped affordance, not a link — it invites typing. */}
      <FadeInUp index={2}>
        <PressScale
          onPress={() => router.push("/kiz-ai")}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`Ask ${aiName} a question`}
          style={styles.askCard}
        >
          <View style={styles.askGlyph}>
            <Icon name="smart_toy" size={20} color={color.brand[700]} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.askTitle}>Ask {aiName}</Text>
            <Text numberOfLines={1} style={styles.askHint}>&ldquo;How do I pay my room fee?&rdquo;</Text>
          </View>
          <View style={styles.askSend}>
            <Icon name="send" size={16} color="#FFFFFF" />
          </View>
        </PressScale>
      </FadeInUp>
    </>
  )
}

/**
 * KIZ Cafe smart ordering — a flagship surface, so it gets its own promoted
 * card right under the AI & AR block. Hidden until the cafe publishes a menu.
 */
function CafeHighlight({ home }: { home: ResidentHome }) {
  const cafe = home.cafe
  if (!cafe) return null

  return (
    <>
      <SectionHeader title="KIZ Cafe" action="Order" onPress={() => router.push("/kafe")} />
      <FadeInUp>
        <PressScale
          onPress={() => router.push("/kafe")}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={`${cafe.name}. Order food. ${cafe.openNow ? "Open now" : "Closed"}`}
          style={styles.cafeCard}
        >
          <GradientBg id="home-cafe" colors={[...gradientStops.cafe]} direction="br" />
          <View style={styles.cafeInner}>
            <View style={styles.cafeTop}>
              <View style={styles.cafeGlyph}>
                <Icon name="restaurant" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.cafeBadge}>
                <Icon name="auto_awesome" size={10} color="#FFFFFF" />
                <Text style={styles.cafeBadgeText}>AI MENU · SMART ORDERING</Text>
              </View>
            </View>
            <Text style={styles.cafeTitle}>{cafe.name}</Text>
            <Text numberOfLines={2} style={styles.cafeTagline}>{cafe.tagline}</Text>
            <View style={styles.cafeMetaRow}>
              <Text numberOfLines={1} style={styles.cafeMeta}>
                {cafe.itemCount} items · {cafe.location}
              </Text>
              <View
                style={[
                  styles.cafeStatus,
                  { backgroundColor: cafe.openNow ? "rgba(255,255,255,0.94)" : "rgba(0,0,0,0.30)" },
                ]}
              >
                <Text style={[styles.cafeStatusText, { color: cafe.openNow ? "#9A3412" : "#FFFFFF" }]}>
                  {cafe.openNow ? "Open now" : "Closed"}
                </Text>
              </View>
            </View>
          </View>
        </PressScale>
      </FadeInUp>
    </>
  )
}

function QuickAccess({ home }: { home: ResidentHome | null }) {
  const actions = orderedActions(home)

  return (
    <>
      <SectionHeader title="Quick Access" action="See all" onPress={() => router.push("/lagi")} />
      <View style={styles.actionGrid}>
        {actions.map((action) => (
          <PressScale
            key={action.key}
            onPress={() => router.push(action.path)}
            scaleTo={0.92}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={styles.quickAction}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
              <Icon name={action.icon} size={25} color={action.ink} />
            </View>
            <Text numberOfLines={2} style={styles.actionLabel}>{action.label}</Text>
          </PressScale>
        ))}
      </View>
    </>
  )
}

/** Running laundry timer — only rendered when one exists. */
function LaundryTile({ home }: { home: ResidentHome }) {
  if (!home.laundry) return null
  return (
    <FadeInUp>
      <PressScale
        onPress={() => router.push("/laundry")}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Laundry running on ${home.laundry.machineName}`}
        style={styles.laundryCard}
      >
        <View style={styles.laundryGlyph}>
          <Icon name="local_laundry_service" size={22} color={moduleTint.laundry.ink} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{home.laundry.machineName} is running</Text>
          <Text style={styles.meta}>Reminder ends {formatWallClockTime(home.laundry.endsAt.slice(11, 16))}</Text>
        </View>
        <Icon name="chevron_right" size={20} color={color.ink[300]} />
      </PressScale>
    </FadeInUp>
  )
}

function Announcement({ home }: { home: ResidentHome }) {
  const item = home.pinnedAnnouncements[0]
  const thumbnail = item?.attachmentType === "image" ? absoluteUrl(item.attachmentUrl) : null
  return (
    <>
      <SectionHeader title="Announcement" action="View all" onPress={() => router.push("/pengumuman")} />
      <PressScale
        onPress={() => router.push("/pengumuman")}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={item ? `Announcement: ${item.title}` : "Announcements"}
        style={StyleSheet.flatten([styles.card, styles.announcementCard])}
      >
        {item ? (
          <>
            <View style={styles.announcementCopy}>
              <Text style={styles.date}>{item.when}</Text>
              <Text numberOfLines={2} style={styles.announcementTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.summary}>{item.content}</Text>
            </View>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.thumbnail} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.thumbnailFallback}><Icon name="campaign" size={28} color={color.brand[600]} /></View>
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <View style={styles.emptyIcon}><Icon name="campaign" size={22} color={color.brand[600]} /></View>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>You&rsquo;re up to date</Text>
              <Text style={styles.summary}>New college announcements will appear here.</Text>
            </View>
          </View>
        )}
      </PressScale>
    </>
  )
}

function ThingsToDo({ home }: { home: ResidentHome }) {
  // Show every outstanding task, not just the first — the progress bar was
  // previously counting tasks the user had no way to see.
  const pending = home.todos.filter((t) => !t.done)
  const progress = home.todos.length ? home.doneCount / home.todos.length : 1

  return (
    <View style={[styles.card, styles.dashboardCard]}>
      <View style={styles.cardHeading}>
        <Icon name="task_alt" size={20} color={color.brand[600]} />
        <Text style={styles.cardTitle}>Things To Do</Text>
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.meta}>Your progress</Text>
        <Text style={styles.progressCount}>{home.doneCount}/{home.todos.length}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {pending.length === 0 ? (
        <View style={styles.allDone}>
          <Icon name="check_circle" size={18} color={color.success.ink} />
          <Text style={styles.allDoneText}>You&rsquo;re all caught up.</Text>
        </View>
      ) : (
        pending.map((task) => (
          <PressScale
            key={task.id}
            onPress={() => router.push(todoHref(task.id))}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={task.title}
            style={styles.taskRow}
          >
            <View style={styles.smallIcon}>
              <Icon name="arrow_forward" size={18} color={color.brand[600]} />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={styles.rowTitle}>{task.title}</Text>
              <Text numberOfLines={1} style={styles.meta}>{task.dueLabel ?? task.ctaLabel}</Text>
            </View>
            <Icon name="chevron_right" size={20} color={color.ink[300]} />
          </PressScale>
        ))
      )}
    </View>
  )
}

function Helpdesk({ home }: { home: ResidentHome }) {
  return (
    <View style={[styles.card, styles.dashboardCard]}>
      <View style={styles.cardHeading}>
        <Icon name="support_agent" size={20} color={color.brand[600]} />
        <Text style={styles.cardTitle}>My Helpdesk</Text>
        {home.officeOpen ? <LiveDot label="OPEN" /> : null}
      </View>
      <View style={styles.helpdeskRow}>
        <View style={styles.ticketIcon}><Icon name="assignment" size={20} color={color.brand[600]} /></View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {home.helpdesk?.subject ?? "No active tickets"}
          </Text>
          <Text numberOfLines={1} style={styles.meta}>
            {home.helpdesk
              ? `#${home.helpdesk.displayId} · ${home.helpdesk.updatedWhen}`
              : "Need assistance? We&rsquo;re here."}
          </Text>
        </View>
        <PressScale
          onPress={() => router.push("/helpdesk")}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel="Open helpdesk"
          style={styles.openButton}
        >
          <Text style={styles.openText}>Open</Text>
        </PressScale>
      </View>
    </View>
  )
}

function Emergency({ home }: { home: ResidentHome }) {
  const contact = home.emergencyContacts[0]
  const call = () =>
    contact?.phone
      ? Linking.openURL(`tel:${contact.phone.replace(/[^+\d]/g, "")}`).catch(() => {})
      : router.push("/sos")

  return (
    <View style={styles.emergencyCard}>
      <View style={styles.shield}><Icon name="security" size={25} color={color.danger.main} /></View>
      <View style={styles.flex}>
        <Text style={styles.emergencyTitle}>Emergency Contact</Text>
        <Text numberOfLines={2} style={styles.summary}>
          {contact?.title ?? "Get immediate help from the KIZ team"}
        </Text>
      </View>
      <PressScale
        onPress={call}
        scaleTo={0.94}
        accessibilityRole="button"
        accessibilityLabel={contact?.phone ? `Call ${contact.title}` : "Open SOS"}
        style={styles.callButton}
      >
        <Icon name="call" size={17} color="#FFFFFF" />
        <Text style={styles.callText}>{contact?.phone ? "Call" : "SOS"}</Text>
      </PressScale>
    </View>
  )
}

export default function DashboardScreen() {
  const theme = useTheme<Theme>()
  const { user, refresh } = useAuth()
  const { isTablet } = useLayout()
  const { data, isLoading, isError, refetch, isRefetching } = useHome()
  const { data: conciergeMeta } = useConciergeMeta()

  // The hero avatar is read from the cached auth user. Refresh it whenever the
  // dashboard regains focus so a photo changed on the eCard tab — or anywhere
  // else (website, another device) — shows up without a cold restart.
  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {})
    }, [refresh])
  )

  if (!user) return null

  const home = data?.home ?? null
  const overlay = data?.heroOverlay ?? DEFAULT_OVERLAY
  const showcase = data?.showcase ?? { lens: null, wayfinder: null }
  const aiName = conciergeMeta?.name ?? "KIZ-AI"

  return (
    <Screen
      scroll
      padded={false}
      edges={["top"]}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      <View style={[styles.page, isTablet && styles.pageWide]}>
        <View style={[styles.column, isTablet && styles.columnWide]}>
          <Hero backgroundUrl={data?.heroBackgroundUrl ?? null} overlay={overlay} home={home} />

          {/* Innovation first — visible without scrolling. */}
          <Showcase backgrounds={showcase} aiName={aiName} />

          {home ? <CafeHighlight home={home} /> : null}

          {home ? <LaundryTile home={home} /> : null}

          <QuickAccess home={home} />

          {isLoading && !home ? (
            <View style={styles.skeletonWrap}>
              <Skeleton.CardList count={2} />
            </View>
          ) : null}

          {isError && !home ? (
            <PressScale onPress={() => void refetch()} style={styles.errorCard}>
              <Icon name="refresh" size={20} color={theme.colors.dangerInk} />
              <Text style={styles.errorText}>Couldn&rsquo;t refresh your home. Tap to retry.</Text>
            </PressScale>
          ) : null}

          {home ? (
            <>
              <Announcement home={home} />
              <View style={[styles.cardGrid, isTablet && styles.cardGridWide]}>
                <View style={styles.flex}><ThingsToDo home={home} /></View>
                <View style={styles.flex}><Helpdesk home={home} /></View>
              </View>
              <Emergency home={home} />
            </>
          ) : null}
        </View>
      </View>
    </Screen>
  )
}

const shadow = elevation.card

const styles = StyleSheet.create({
  page: { backgroundColor: color.canvasSunk, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36, minHeight: "100%" },
  pageWide: { paddingHorizontal: 24 },
  // Centres and caps the dashboard on iPad instead of stretching to 1024pt.
  column: { width: "100%" },
  columnWide: { maxWidth: 860, alignSelf: "center" },
  flex: { flex: 1 },

  hero: { height: 232, borderRadius: 28, overflow: "hidden", backgroundColor: "#08799D", ...shadow },
  heroCompact: { height: 200 },
  heroContent: { flex: 1, padding: 20, justifyContent: "space-between" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 9 },
  logoWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,.94)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: "#FFFFFF", fontSize: 16, lineHeight: 19, fontWeight: "800" },
  collegeName: { color: "rgba(255,255,255,.74)", fontSize: 11.5, lineHeight: 16 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.15)", borderWidth: 1, borderColor: "rgba(255,255,255,.17)", alignItems: "center", justifyContent: "center" },
  identityRow: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  identityCopy: { flex: 1, minWidth: 0 },
  greeting: { color: "rgba(255,255,255,.78)", fontSize: 13, lineHeight: 18, marginBottom: 2 },
  userName: { color: "#FFFFFF", fontSize: 25, lineHeight: 29, fontWeight: "700", letterSpacing: -0.7 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7, flexWrap: "wrap" },
  matric: { color: "rgba(255,255,255,.86)", fontSize: 11.5, lineHeight: 16, fontWeight: "600", letterSpacing: .3 },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: "rgba(255,255,255,.20)" },
  heroChipText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700", letterSpacing: .3 },
  roomLine: { color: "rgba(255,255,255,.80)", fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  avatarRing: { width: 70, height: 70, borderRadius: 35, padding: 3, backgroundColor: "rgba(255,255,255,.23)" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { flex: 1, borderRadius: 32, backgroundColor: "#DDF7FC", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#08728F", fontSize: 24, fontWeight: "700" },

  sectionHeader: { marginTop: 26, marginBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  sectionTitle: { color: color.ink[900], fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.35 },
  sectionAction: { color: color.brand[600], fontSize: 12.5, lineHeight: 18, fontWeight: "700" },
  sectionActionHit: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },

  showcaseRow: { flexDirection: "row", gap: 12 },
  showcaseRowWide: { gap: 16 },
  showcaseFlex: { flex: 1 },
  showcaseCard: { height: 168, borderRadius: 22, overflow: "hidden", ...shadow },
  showcaseScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(2, 20, 31, 0.30)" },
  showcaseInner: { flex: 1, padding: 15, justifyContent: "space-between" },
  showcaseTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  showcaseGlyph: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,.20)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)", alignItems: "center", justifyContent: "center" },
  showcaseBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(0,0,0,.24)" },
  showcaseBadgeText: { color: "#FFFFFF", fontSize: 8.5, fontWeight: "800", letterSpacing: .5 },
  showcaseTitle: { color: "#FFFFFF", fontSize: 17, lineHeight: 21, fontWeight: "800", letterSpacing: -0.3 },
  showcaseTagline: { color: "rgba(255,255,255,.88)", fontSize: 11.5, lineHeight: 15, marginTop: 3 },

  cafeCard: { height: 176, borderRadius: 22, overflow: "hidden", ...shadow },
  cafeInner: { flex: 1, padding: 16, justifyContent: "space-between" },
  cafeTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  cafeGlyph: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,.20)", borderWidth: 1, borderColor: "rgba(255,255,255,.28)", alignItems: "center", justifyContent: "center" },
  cafeBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(0,0,0,.26)" },
  cafeBadgeText: { color: "#FFFFFF", fontSize: 8.5, fontWeight: "800", letterSpacing: .5 },
  cafeTitle: { color: "#FFFFFF", fontSize: 19, lineHeight: 23, fontWeight: "800", letterSpacing: -0.4 },
  cafeTagline: { color: "rgba(255,255,255,.9)", fontSize: 12, lineHeight: 16, marginTop: 3 },
  cafeMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 },
  cafeMeta: { color: "rgba(255,255,255,.85)", fontSize: 11.5, fontWeight: "600", flex: 1, minWidth: 0 },
  cafeStatus: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  cafeStatusText: { fontSize: 10.5, fontWeight: "800", letterSpacing: .3 },

  askCard: { marginTop: 12, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: color.brand[100], padding: 12, flexDirection: "row", alignItems: "center", gap: 11, ...shadow },
  askGlyph: { width: 40, height: 40, borderRadius: 13, backgroundColor: color.brand[50], alignItems: "center", justifyContent: "center" },
  askTitle: { color: color.ink[900], fontSize: 14.5, lineHeight: 19, fontWeight: "700" },
  askHint: { color: color.ink[500], fontSize: 12, lineHeight: 16, marginTop: 1, fontStyle: "italic" },
  askSend: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.brand[600], alignItems: "center", justifyContent: "center" },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 18 },
  quickAction: { width: "25%", alignItems: "center", paddingHorizontal: 3 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: color.ink[700], fontSize: 11.5, lineHeight: 14, fontWeight: "600", textAlign: "center", marginTop: 8 },

  card: { borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(15,23,42,.055)", ...shadow },
  announcementCard: { minHeight: 130, padding: 10, flexDirection: "row", gap: 12, overflow: "hidden" },
  announcementCopy: { flex: 1, minWidth: 0, padding: 7, justifyContent: "center" },
  date: { color: color.brand[600], fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
  announcementTitle: { color: color.ink[900], fontSize: 16, lineHeight: 20, fontWeight: "700", marginTop: 4 },
  summary: { color: color.ink[500], fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  thumbnail: { width: 104, borderRadius: 16, backgroundColor: color.canvasSunk },
  thumbnailFallback: { width: 86, borderRadius: 16, backgroundColor: color.brand[50], alignItems: "center", justifyContent: "center" },
  emptyRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: color.brand[50], alignItems: "center", justifyContent: "center" },

  cardGrid: { gap: 14, marginTop: 16 },
  cardGridWide: { flexDirection: "row", alignItems: "flex-start" },
  dashboardCard: { padding: 18 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { color: color.ink[900], fontSize: 16, lineHeight: 21, fontWeight: "700", letterSpacing: -0.2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 17, marginBottom: 8 },
  meta: { color: color.ink[500], fontSize: 11.5, lineHeight: 16 },
  progressCount: { color: color.brand[600], fontSize: 12, lineHeight: 16, fontWeight: "700" },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: color.border, overflow: "hidden" },
  progressBar: { height: 7, borderRadius: 4, backgroundColor: color.brand[600] },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 15, minHeight: 44 },
  smallIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.brand[50], alignItems: "center", justifyContent: "center" },
  rowTitle: { color: color.ink[900], fontSize: 13.5, lineHeight: 18, fontWeight: "700" },
  allDone: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 16 },
  allDoneText: { color: color.success.ink, fontSize: 13, lineHeight: 18, fontWeight: "600" },

  laundryCard: { marginTop: 16, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CCF0E7", padding: 13, flexDirection: "row", alignItems: "center", gap: 11, ...shadow },
  laundryGlyph: { width: 42, height: 42, borderRadius: 14, backgroundColor: moduleTint.laundry.bg, alignItems: "center", justifyContent: "center" },

  helpdeskRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 17 },
  ticketIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: color.brand[50], alignItems: "center", justifyContent: "center" },
  openButton: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: color.brand[200], alignItems: "center", justifyContent: "center" },
  openText: { color: color.brand[700], fontSize: 12.5, fontWeight: "700" },

  emergencyCard: { marginTop: 16, borderRadius: 22, backgroundColor: "#FFF0F1", borderWidth: 1, borderColor: "#FFDADD", padding: 17, flexDirection: "row", alignItems: "center", gap: 12 },
  shield: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFDDE0", alignItems: "center", justifyContent: "center" },
  emergencyTitle: { color: color.ink[900], fontSize: 15.5, lineHeight: 20, fontWeight: "700" },
  callButton: { minHeight: 44, borderRadius: 13, paddingHorizontal: 14, backgroundColor: color.danger.main, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  callText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },

  skeletonWrap: { marginTop: 8 },
  errorCard: { marginTop: 24, borderRadius: 18, padding: 16, backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { color: "#B91C1C", fontSize: 13, lineHeight: 18, fontWeight: "600" },
})

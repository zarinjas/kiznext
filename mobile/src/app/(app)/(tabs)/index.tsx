import { Image } from "expo-image"
import { router, type Href } from "expo-router"
import { useTheme } from "@shopify/restyle"
import { Linking, Pressable, StyleSheet, View } from "react-native"

import { GradientBg } from "@/components/gradient"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL, absoluteUrl } from "@/lib/config"
import { useHome } from "@/lib/hooks"
import type { HomeTodo, ResidentHome } from "@/lib/types"
import { LoadingScreen, Screen, Text, type Theme } from "@/ui"
import { Icon } from "@/ui/icon"

const LOGO_URL = `${API_BASE_URL}/api/app-icon?size=192`

const QUICK_ACTIONS: { label: string; icon: string; path: Href; bg: string; ink: string }[] = [
  { label: "AR Directory", icon: "view_in_ar", path: "/direktori", bg: "#E7F5FF", ink: "#1684B8" },
  { label: "SOS", icon: "sos", path: "/sos", bg: "#FFECEC", ink: "#E44747" },
  { label: "Translate", icon: "translate", path: "/ar-terjemah", bg: "#F0EBFF", ink: "#7758D6" },
  { label: "Laundry", icon: "local_laundry_service", path: "/laundry", bg: "#E8F8F4", ink: "#178D77" },
  { label: "Room Selection", icon: "bedroom_parent", path: "/bilik", bg: "#FFF2E5", ink: "#D9781D" },
  { label: "Check-In/Out", icon: "how_to_reg", path: "/checkin", bg: "#EAF0FF", ink: "#4F6FD8" },
  { label: "Facilities", icon: "meeting_room", path: "/tempahan-fasiliti", bg: "#E8F8FA", ink: "#008FA8" },
  { label: "Digital Guide", icon: "menu_book", path: "/panduan", bg: "#FCECF4", ink: "#C34C83" },
]

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

function todoHref(id: HomeTodo["id"]): Href {
  if (id === "announcement") return "/pengumuman"
  if (id === "ecard") return "/kad-maya"
  return "/bilik"
}

function HeaderButton({ icon, label, path }: { icon: string; label: string; path: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(path)}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={20} color="#FFFFFF" />
    </Pressable>
  )
}

function Hero({ backgroundUrl }: { backgroundUrl: string | null }) {
  const { user } = useAuth()
  if (!user) return null
  const avatar = absoluteUrl(user.avatarUrl)
  const background = absoluteUrl(backgroundUrl)

  return (
    <View style={styles.hero}>
      {background ? (
        <Image source={{ uri: background }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
      ) : (
        <GradientBg id="mobile-home-hero" colors={["#006D91", "#0097C9", "#5BD1E2"]} />
      )}
      <View style={styles.heroScrim} />
      <View style={styles.heroContent}>
        <View style={styles.heroTop}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>myKIZ</Text>
              <Text numberOfLines={1} style={styles.collegeName}>Kolej Ibrahim Yaakub</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <HeaderButton icon="notifications" label="Notifications" path="/pengumuman" />
            <HeaderButton icon="settings" label="Settings" path="/profile" />
          </View>
        </View>

        <View style={styles.identityRow}>
          <View style={styles.identityCopy}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text numberOfLines={2} style={styles.userName}>{user.name.trim()}</Text>
            <Text style={styles.matric}>{user.matricId}</Text>
            {user.email ? <Text numberOfLines={1} style={styles.email}>{user.email}</Text> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push("/profile")} style={({ pressed }) => [styles.avatarRing, pressed && styles.pressed]}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{user.name.charAt(0).toUpperCase()}</Text></View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  )
}

function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  )
}

function QuickAccess() {
  return (
    <>
      <SectionHeader title="Quick Access" action="See all" onPress={() => router.push("/lagi")} />
      <View style={styles.actionGrid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => router.push(action.path)}
            style={({ pressed }) => [styles.quickAction, pressed && styles.quickPressed]}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.bg }]}><Icon name={action.icon} size={25} color={action.ink} /></View>
            <Text numberOfLines={2} style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  )
}

function Announcement({ home }: { home: ResidentHome }) {
  const item = home.pinnedAnnouncements[0]
  const thumbnail = item?.attachmentType === "image" ? absoluteUrl(item.attachmentUrl) : null
  return (
    <>
      <SectionHeader title="Announcement" action="View all" onPress={() => router.push("/pengumuman")} />
      <Pressable accessibilityRole="button" onPress={() => router.push("/pengumuman")} style={({ pressed }) => [styles.card, styles.announcementCard, pressed && styles.pressed]}>
        {item ? (
          <>
            <View style={styles.announcementCopy}>
              <Text style={styles.date}>{item.when}</Text>
              <Text numberOfLines={2} style={styles.announcementTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.summary}>{item.content}</Text>
            </View>
            {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.thumbnail} contentFit="cover" transition={150} /> : <View style={styles.thumbnailFallback}><Icon name="campaign" size={28} color="#0097C9" /></View>}
          </>
        ) : (
          <View style={styles.emptyRow}><View style={styles.emptyIcon}><Icon name="campaign" size={22} color="#0097C9" /></View><View style={styles.flex}><Text style={styles.rowTitle}>You’re up to date</Text><Text style={styles.summary}>New college announcements will appear here.</Text></View></View>
        )}
      </Pressable>
    </>
  )
}

function ThingsToDo({ home }: { home: ResidentHome }) {
  const task = home.todos.find((item) => !item.done) ?? home.todos[0]
  const progress = home.todos.length ? home.doneCount / home.todos.length : 1
  return (
    <View style={[styles.card, styles.dashboardCard]}>
      <View style={styles.cardHeading}><Icon name="task_alt" size={20} color="#0097C9" /><Text style={styles.cardTitle}>Things To Do</Text></View>
      <View style={styles.progressLabels}><Text style={styles.meta}>Your progress</Text><Text style={styles.progressCount}>{home.doneCount}/{home.todos.length}</Text></View>
      <View style={styles.progressTrack}><View style={[styles.progressBar, { width: `${progress * 100}%` }]} /></View>
      {task ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(todoHref(task.id))} style={({ pressed }) => [styles.taskRow, pressed && styles.pressed]}>
          <View style={[styles.smallIcon, task.done && styles.doneIcon]}><Icon name={task.done ? "check" : "arrow_forward"} size={18} color={task.done ? "#16A34A" : "#0097C9"} /></View>
          <View style={styles.flex}><Text numberOfLines={1} style={styles.rowTitle}>{task.title}</Text><Text numberOfLines={1} style={styles.meta}>{task.done ? "Completed" : task.dueLabel ?? task.ctaLabel}</Text></View>
          <Icon name="chevron_right" size={20} color="#A1A1AA" />
        </Pressable>
      ) : <Text style={[styles.summary, styles.cardEmpty]}>You’re all caught up.</Text>}
    </View>
  )
}

function Helpdesk({ home }: { home: ResidentHome }) {
  return (
    <View style={[styles.card, styles.dashboardCard]}>
      <View style={styles.cardHeading}><Icon name="support_agent" size={20} color="#0097C9" /><Text style={styles.cardTitle}>My Helpdesk</Text></View>
      <View style={styles.helpdeskRow}>
        <View style={styles.ticketIcon}><Icon name="assignment" size={20} color="#0097C9" /></View>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.rowTitle}>{home.helpdesk?.subject ?? "No active tickets"}</Text>
          <Text numberOfLines={1} style={styles.meta}>{home.helpdesk ? `#${home.helpdesk.displayId} · ${home.helpdesk.updatedWhen}` : "Need assistance? We’re here."}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/helpdesk")} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}><Text style={styles.openText}>Open</Text></Pressable>
      </View>
    </View>
  )
}

function Emergency({ home }: { home: ResidentHome }) {
  const contact = home.emergencyContacts[0]
  const call = () => contact?.phone ? Linking.openURL(`tel:${contact.phone}`).catch(() => {}) : router.push("/sos")
  return (
    <View style={styles.emergencyCard}>
      <View style={styles.shield}><Icon name="security" size={25} color="#D93443" /></View>
      <View style={styles.flex}><Text style={styles.emergencyTitle}>Emergency Contact</Text><Text numberOfLines={2} style={styles.summary}>{contact?.title ?? "Get immediate help from the KIZ team"}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={contact?.phone ? `Call ${contact.title}` : "Get emergency help"} onPress={call} style={({ pressed }) => [styles.callButton, pressed && styles.pressed]}><Icon name="call" size={17} color="#FFFFFF" /><Text style={styles.callText}>{contact?.phone ? "Call" : "SOS"}</Text></Pressable>
    </View>
  )
}

export default function DashboardScreen() {
  const theme = useTheme<Theme>()
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isRefetching } = useHome()
  if (!user) return null
  if (isLoading) return <LoadingScreen label="Loading your dashboard…" />

  const home = data?.home ?? null
  return (
    <Screen scroll padded={false} edges={["top"]} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <View style={styles.page}>
        <Hero backgroundUrl={data?.heroBackgroundUrl ?? null} />
        <QuickAccess />
        {isError && !home ? (
          <Pressable onPress={() => void refetch()} style={styles.errorCard}><Icon name="refresh" size={20} color={theme.colors.dangerInk} /><Text style={styles.errorText}>Couldn’t refresh your home. Tap to retry.</Text></Pressable>
        ) : null}
        {home ? (
          <>
            <Announcement home={home} />
            <View style={styles.cardGrid}><ThingsToDo home={home} /><Helpdesk home={home} /></View>
            <Emergency home={home} />
          </>
        ) : null}
      </View>
    </Screen>
  )
}

const shadow = {
  shadowColor: "#0F263F",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 3,
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#F7F9FC", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36, minHeight: "100%" },
  flex: { flex: 1 },
  hero: { height: 228, borderRadius: 28, overflow: "hidden", backgroundColor: "#08799D", ...shadow },
  heroScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(2, 20, 31, 0.50)" },
  heroContent: { flex: 1, padding: 20, justifyContent: "space-between" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 9 },
  logoWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(255,255,255,.94)", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: 31, height: 31 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandName: { color: "#FFFFFF", fontSize: 16, lineHeight: 19, fontWeight: "800" },
  collegeName: { color: "rgba(255,255,255,.74)", fontSize: 11.5, lineHeight: 16 },
  headerActions: { flexDirection: "row", gap: 7 },
  headerButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.15)", borderWidth: 1, borderColor: "rgba(255,255,255,.17)", alignItems: "center", justifyContent: "center" },
  identityRow: { flexDirection: "row", alignItems: "flex-end", gap: 14 },
  identityCopy: { flex: 1, minWidth: 0 },
  greeting: { color: "rgba(255,255,255,.78)", fontSize: 13, lineHeight: 18, marginBottom: 2 },
  userName: { color: "#FFFFFF", fontSize: 25, lineHeight: 29, fontWeight: "700", letterSpacing: -0.7 },
  matric: { color: "rgba(255,255,255,.86)", fontSize: 11.5, lineHeight: 16, fontWeight: "600", marginTop: 7, letterSpacing: .3 },
  email: { color: "rgba(255,255,255,.68)", fontSize: 11.5, lineHeight: 15, marginTop: 1 },
  avatarRing: { width: 70, height: 70, borderRadius: 35, padding: 3, backgroundColor: "rgba(255,255,255,.23)" },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { flex: 1, borderRadius: 32, backgroundColor: "#DDF7FC", alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#08728F", fontSize: 24, fontWeight: "700" },
  sectionHeader: { marginTop: 28, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#101827", fontSize: 18, lineHeight: 23, fontWeight: "700", letterSpacing: -0.35 },
  sectionAction: { color: "#0097C9", fontSize: 12.5, lineHeight: 18, fontWeight: "700" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 18 },
  quickAction: { width: "25%", alignItems: "center", paddingHorizontal: 3 },
  quickPressed: { opacity: .72, transform: [{ scale: .96 }] },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: "#273343", fontSize: 11.5, lineHeight: 14, fontWeight: "600", textAlign: "center", marginTop: 8 },
  card: { borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(15,23,42,.055)", ...shadow },
  announcementCard: { minHeight: 130, padding: 10, flexDirection: "row", gap: 12, overflow: "hidden" },
  announcementCopy: { flex: 1, minWidth: 0, padding: 7, justifyContent: "center" },
  date: { color: "#0097C9", fontSize: 11.5, lineHeight: 15, fontWeight: "700" },
  announcementTitle: { color: "#111827", fontSize: 16, lineHeight: 20, fontWeight: "700", marginTop: 4 },
  summary: { color: "#667085", fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  thumbnail: { width: 104, borderRadius: 16, backgroundColor: "#EEF3F6" },
  thumbnailFallback: { width: 86, borderRadius: 16, backgroundColor: "#E7F5FF", alignItems: "center", justifyContent: "center" },
  emptyRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 8 },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: "#E7F5FF", alignItems: "center", justifyContent: "center" },
  cardGrid: { gap: 14, marginTop: 16 },
  dashboardCard: { padding: 18 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardTitle: { color: "#111827", fontSize: 16, lineHeight: 21, fontWeight: "700", letterSpacing: -0.2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 17, marginBottom: 8 },
  meta: { color: "#667085", fontSize: 11.5, lineHeight: 16 },
  progressCount: { color: "#0097C9", fontSize: 12, lineHeight: 16, fontWeight: "700" },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: "#EAF1F5", overflow: "hidden" },
  progressBar: { height: 7, borderRadius: 4, backgroundColor: "#0097C9" },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 17 },
  smallIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#E7F5FF", alignItems: "center", justifyContent: "center" },
  doneIcon: { backgroundColor: "#F0FDF4" },
  rowTitle: { color: "#192230", fontSize: 13.5, lineHeight: 18, fontWeight: "700" },
  cardEmpty: { marginTop: 16 },
  helpdeskRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 17 },
  ticketIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#E7F5FF", alignItems: "center", justifyContent: "center" },
  openButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: "#B8DDE9", alignItems: "center", justifyContent: "center" },
  openText: { color: "#0086B3", fontSize: 12.5, fontWeight: "700" },
  emergencyCard: { marginTop: 16, borderRadius: 22, backgroundColor: "#FFF0F1", borderWidth: 1, borderColor: "#FFDADD", padding: 17, flexDirection: "row", alignItems: "center", gap: 12 },
  shield: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#FFDDE0", alignItems: "center", justifyContent: "center" },
  emergencyTitle: { color: "#171C26", fontSize: 15.5, lineHeight: 20, fontWeight: "700" },
  callButton: { minHeight: 40, borderRadius: 13, paddingHorizontal: 13, backgroundColor: "#D93443", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  callText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "700" },
  errorCard: { marginTop: 24, borderRadius: 18, padding: 16, backgroundColor: "#FEF2F2", flexDirection: "row", alignItems: "center", gap: 10 },
  errorText: { color: "#B91C1C", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  pressed: { opacity: .68 },
})

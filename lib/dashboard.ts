import { prisma } from "@/lib/db"
import { getBilikReminder, getResidentRoomDetail } from "@/lib/bilik"
import { getCheckInStatusForMatrics, type CheckInStatusValue } from "@/lib/checkin"
import { nowMalaysia, formatMalaysia } from "@/lib/timezone"
import { isOfficeHours } from "@/lib/office-hours"

/**
 * Member ("resident-style") dashboard data assembly.
 *
 * Everything needed by the rebuilt `AhliHome` — the structured room/roommate
 * placement, the "Things to Do" checklist, and the small living-at-KIZ widgets
 * (Important Notice, Upcoming at KIZ, My Helpdesk Request, Emergency Contact,
 * Life at KIZ). Display strings are precomputed here (Asia/Kuala_Lumpur) so the
 * client never does its own timezone maths.
 *
 * Server-only module: imported by server components / server actions only.
 */

export type TodoStatus = "done" | "todo"

export interface HomeTodo {
  id: "room" | "announcement" | "ecard"
  title: string
  subtitle: string | null
  /** Short human label for the deadline, e.g. "before 10 September". */
  dueLabel: string | null
  done: boolean
  /** Primary destination for the row CTA. */
  href: string
  ctaLabel: string
}

export interface ImportantNoticeView {
  id: string
  title: string
  content: string
  when: string
}

export interface PinnedAnnouncementView {
  id: string
  title: string
  content: string
  tag: string
  attachmentUrl: string | null
  attachmentType: string | null
  when: string
}

export interface EventView {
  id: string
  title: string
  description: string | null
  venue: string | null
  when: string
}

export interface HelpdeskSummaryView {
  displayId: number
  status: string
  subject: string
  updatedWhen: string
}

export interface EmergencyContactView {
  id: string
  title: string
  phone: string | null
  subtitle: string | null
  body: string | null
}

export interface LivingGuideView {
  id: string
  title: string
  subtitle: string | null
  body: string | null
  link: string | null
}

export interface ResidentHomeData {
  /** Canonical room line + session + roommate, null until published. */
  room: {
    roomCode: string
    /** "Block K18A · Room 101 · Bed A" style parts. */
    blockName: string
    roomNumber: string
    bed: string | null
    session: string | null
    roommateName: string | null
    roommateMatricId: string | null
  } | null
  todos: HomeTodo[]
  /** done count across the todo list (for the progress bar). */
  doneCount: number
  /** Check-in / check-out status for the current session (students only). */
  checkInStatus: CheckInStatusValue | null
  /** Active pinned announcements surfaced at the top of the member home. */
  pinnedAnnouncements: PinnedAnnouncementView[]
  importantNotice: ImportantNoticeView | null
  nextEvents: EventView[]
  helpdesk: HelpdeskSummaryView | null
  /** Whether the KIZ office is open right now (Asia/Kuala_Lumpur). */
  officeOpen: boolean
  emergencyContacts: EmergencyContactView[]
  livingGuides: LivingGuideView[]
}

function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
  }).format(d)
}

/**
 * The important announcement a member must acknowledge = the latest pinned
 * "important"-tagged, non-expired announcement. Reused by the pengumuman page.
 */
export async function getAcknowledgmentTarget() {
  const now = nowMalaysia()
  return prisma.announcement.findFirst({
    where: {
      deletedAt: null,
      tag: "important",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })
}

/**
 * Assemble the full member-home payload for the logged-in user. `role` selects
 * the routing base (`/${role}/...`); only `ahli` gets accommodation tasks.
 */
export async function getResidentHomeData(input: {
  userId: string
  matricId: string
  role: "ahli" | "staf" | "fellow"
}): Promise<ResidentHomeData> {
  const { userId, matricId, role } = input
  const now = nowMalaysia()

  const [user, reminder] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { ecardRegisteredAt: true },
    }),
    role === "ahli" ? getBilikReminder(userId, matricId) : Promise.resolve(null),
  ])

  const ecardDone = Boolean(user?.ecardRegisteredAt)

  // Eligible-student record on the active intake, with accommodation outcome.
  let onboarding: { hasPick: boolean; placed: boolean } | null = null

  if (role === "ahli") {
    const student = await prisma.eligibleStudent.findFirst({
      where: { intake: { status: "active", deletedAt: null }, matricId: matricId.toUpperCase(), deletedAt: null },
      include: {
        roomApplication: { where: { deletedAt: null }, select: { id: true } },
        roommateApplications: { where: { deletedAt: null, status: "roommate_confirmed" }, select: { id: true } },
        bed: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    if (student) {
      const hasPick = Boolean(student.roomApplication || student.roommateApplications.length)
      onboarding = { hasPick, placed: Boolean(student.bed) }
    }
  }

  // ── Acknowledgement target (also feeds the Important Notice widget) ──────
  const [targetAnnouncement, pinnedAnnouncements, ackedRows, nextEvents, helpdeskTickets, contentItems, roomDetail] =
    await Promise.all([
      getAcknowledgmentTarget(),
      prisma.announcement.findMany({
        where: {
          deletedAt: null,
          isPinned: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.announcementAcknowledgment.findMany({
        where: { userId, deletedAt: null },
        select: { announcementId: true },
      }),
      prisma.event.findMany({
        where: { deletedAt: null, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      prisma.helpdeskTicket.findMany({
        where: { userId, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 1,
      }),
      prisma.contentItem.findMany({
        where: { deletedAt: null },
        orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      getResidentRoomDetail(userId),
    ])

  const ackedSet = new Set(ackedRows.map((a) => a.announcementId))
  const announcementDone = targetAnnouncement ? ackedSet.has(targetAnnouncement.id) : false

  // Check-in / check-out status for the current session (students only).
  const checkInStatus: CheckInStatusValue | null =
    role === "ahli"
      ? (await getCheckInStatusForMatrics([matricId]))[matricId.toUpperCase()] ?? "not_checked_in"
      : null

  // ── Things to Do ─────────────────────────────────────────────────────────
  const todos: HomeTodo[] = []

  // 1. Room selection / accommodation application.
  if (role === "ahli" && onboarding) {
    const placedOrApplied = onboarding.hasPick || onboarding.placed
    const roomDone = placedOrApplied
    const windowState = reminder?.state ?? null
    const stillActionable = windowState === "open" || windowState === "closing_soon"
    if (roomDone) {
      todos.push({
        id: "room",
        title: "Complete room selection",
        subtitle: "Your accommodation preference is in.",
        dueLabel: null,
        done: true,
        href: `/${role}/bilik`,
        ctaLabel: "View",
      })
    } else if (stillActionable) {
      const closes = reminder?.closesAt ? new Date(reminder.closesAt) : null
      todos.push({
        id: "room",
        title: "Complete room selection",
        subtitle: closes && closes.getTime() < now.getTime() ? "Room selection closed — contact the KIZ office." : null,
        dueLabel: closes ? `before ${dateLabel(closes)}` : null,
        done: false,
        href: `/${role}/bilik`,
        ctaLabel: "Choose room",
      })
    }
  }

  // 2. Acknowledge important announcement.
  if (targetAnnouncement) {
    todos.push({
      id: "announcement",
      title: "Acknowledge important announcement",
      subtitle: targetAnnouncement.title,
      dueLabel: null,
      done: announcementDone,
      href: `/${role}/pengumuman`,
      ctaLabel: announcementDone ? "View" : "Acknowledge",
    })
  }

  // 3. eCard registration — user-level, every member.
  todos.push({
    id: "ecard",
    title: "Register your eCard",
    subtitle: ecardDone ? "Your eCard is ready." : null,
    dueLabel: null,
    done: ecardDone,
    href: `/${role}/kad-maya`,
    ctaLabel: ecardDone ? "View" : "Open eCard",
  })

  // ── Widgets ──────────────────────────────────────────────────────────────
  const pinnedAnnouncementViews: PinnedAnnouncementView[] = pinnedAnnouncements.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content,
    tag: a.tag,
    attachmentUrl: a.attachmentUrl,
    attachmentType: a.attachmentType,
    when: dateLabel(a.createdAt),
  }))

  const importantNotice: ImportantNoticeView | null = targetAnnouncement
    ? {
        id: targetAnnouncement.id,
        title: targetAnnouncement.title,
        content: targetAnnouncement.content,
        when: formatMalaysia(targetAnnouncement.createdAt),
      }
    : null

  const nextEventViews: EventView[] = nextEvents.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    venue: e.venue,
    when: formatMalaysia(e.startsAt),
  }))

  const helpdeskRow = helpdeskTickets[0]
  const helpdesk: HelpdeskSummaryView | null = helpdeskRow
    ? {
        displayId: helpdeskRow.displayId,
        status: helpdeskRow.status,
        subject: helpdeskRow.subject ?? `Request #${helpdeskRow.displayId}`,
        updatedWhen: formatMalaysia(helpdeskRow.updatedAt),
      }
    : null

  const emergencyContacts = contentItems
    .filter((c) => c.kind === "emergency_contact")
    .map((c) => ({
      id: c.id,
      title: c.title,
      phone: c.phone,
      subtitle: c.subtitle,
      body: c.body,
    }))

  const livingGuides = contentItems
    .filter((c) => c.kind === "living_guide")
    .map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      body: c.body,
      link: c.link,
    }))

  return {
    room: roomDetail
      ? {
          roomCode: roomDetail.roomCode,
          blockName: roomDetail.blockName,
          roomNumber: roomDetail.roomNumber,
          bed: roomDetail.bed,
          session: roomDetail.session,
          roommateName: roomDetail.roommate?.name ?? null,
          roommateMatricId: roomDetail.roommate?.matricId ?? null,
        }
      : null,
    todos,
    doneCount: todos.filter((t) => t.done).length,
    checkInStatus,
    pinnedAnnouncements: pinnedAnnouncementViews,
    importantNotice,
    nextEvents: nextEventViews,
    helpdesk,
    officeOpen: isOfficeHours(now),
    emergencyContacts,
    livingGuides,
  }
}

import { prisma } from "@/lib/db"
import { nowMalaysia, windowState, roomSeatState, shortName, type WindowState } from "@/lib/room-selection"
import type {
  PickerState,
  BlockView,
  RoomView,
  BedView,
  MyPick,
  OccupancySummary,
} from "@/components/shared/bilik/types"

/** The active selection window, or null. */
export async function getActiveWindow() {
  return prisma.selectionWindow.findFirst({
    where: { isActive: true, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

/** The current state of the active window, or null when there is no window. */
export async function getBilikWindowState(): Promise<WindowState | null> {
  const win = await getActiveWindow()
  if (!win) return null
  return windowState(
    { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
    nowMalaysia(),
  )
}

export interface BilikReminder {
  state: WindowState
  eligible: boolean
  hasPick: boolean
  show: boolean
  closesAt: string | null
}

/**
 * Whether the dashboard should remind the current student to submit an
 * accommodation preference. Final bed allocation is an admin-only action.
 */
export async function getBilikReminder(userId: string, matricId: string): Promise<BilikReminder | null> {
  const win = await getActiveWindow()
  if (!win) return null

  const ws = windowState(
    { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
    nowMalaysia(),
  )
  const base: BilikReminder = {
    state: ws,
    eligible: false,
    hasPick: false,
    show: false,
    closesAt: win.closesAt.toISOString(),
  }

  const actionable = ws === "open" || ws === "closing_soon"
  if (!actionable) return base

  const intake = await getActiveIntake()
  if (!intake) return base

  const student = await prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId: matricId.toUpperCase(), deletedAt: null },
    select: {
      id: true,
      roomApplication: { where: { deletedAt: null }, select: { id: true } },
      roommateApplications: { where: { deletedAt: null, status: "roommate_confirmed" }, select: { id: true } },
    },
  })
  if (!student) return base

  return {
    ...base,
    eligible: true,
    hasPick: Boolean(student.roomApplication || student.roommateApplications.length),
    show: !student.roomApplication && student.roommateApplications.length === 0,
  }
}

/**
 * How much occupant detail students see on a taken bed.
 *  - `full`    → short name, matric, religion, race, nationality
 *  - `limited` → short name and nationality only
 * Stored in the AppSetting key/value store; defaults to `full`.
 */
export type OccupantPrivacy = "full" | "limited"
export const OCCUPANT_PRIVACY_KEY = "bilik_occupant_privacy"
export const ALLOCATIONS_PUBLISHED_KEY = "bilik_allocations_published"

export async function getOccupantPrivacy(): Promise<OccupantPrivacy> {
  const row = await prisma.appSetting.findUnique({ where: { key: OCCUPANT_PRIVACY_KEY } })
  return row?.value === "limited" ? "limited" : "full"
}

/** Final allocations remain private until the KIZ office explicitly publishes them. */
export async function areAllocationsPublished(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: ALLOCATIONS_PUBLISHED_KEY } })
  return row?.value === "true"
}

/** The active intake, or null. */
export async function getActiveIntake() {
  return prisma.intake.findFirst({
    where: { status: "active", deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Aggregate occupancy for the monitor. Read-only and role-agnostic — callers
 * decide the access level (admins through a gated action, `pengetua` directly).
 */
export async function getOccupancySummary(): Promise<OccupancySummary> {
  const beds = await prisma.bed.findMany({
    where: { deletedAt: null, room: { deletedAt: null } },
    include: { room: true },
  })
  const totalBeds = beds.filter((b) => b.room.status !== "closed").length
  const filled = beds.filter((b) => b.occupantId).length
  const maintenance = beds.filter((b) => b.room.status === "maintenance").length

  const activeIntake = await getActiveIntake()
  let notSelected = 0
  if (activeIntake) {
    notSelected = await prisma.eligibleStudent.count({
      where: { intakeId: activeIntake.id, deletedAt: null, selectedAt: null },
    })
  }

  const free = Math.max(0, totalBeds - filled - maintenance)
  const occupancyPct = totalBeds > 0 ? Math.round((filled / totalBeds) * 100) : 0

  return { totalBeds, filled, free, maintenance, notSelected, occupancyPct }
}

/**
 * Resolve the EligibleStudent record for the logged-in user under the active
 * intake, linking the login account on first match. Returns null if not eligible.
 */
export async function resolveEligibleStudent(userId: string, matricId: string) {
  const intake = await getActiveIntake()
  if (!intake) return null

  let student = await prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId: matricId.toUpperCase(), deletedAt: null },
    include: { bed: { include: { room: { include: { block: true } } } } },
  })
  if (!student) return null

  // Link the login account the first time this student shows up.
  if (!student.userId) {
    await prisma.eligibleStudent.update({
      where: { id: student.id },
      data: { userId },
    })
    student = { ...student, userId }
  }
  return student
}

export type RoomApplicationState = {
  eligible: boolean
  windowState: WindowState
  window: { name: string; opensAt: string; closesAt: string; closingSoonHours: number } | null
  application: null | {
    type: "single" | "double" | "flexible"
    status: "single_pending" | "roommate_pending" | "roommate_confirmed" | "flexible_submitted" | "roommate_rejected" | "allocated" | "withdrawn"
    submittedAt: string
    roommate: { race: string | null; religion: string | null } | null
  }
  incomingRequest: null | { applicantRace: string | null; applicantReligion: string | null }
  allocation: string | null
  reason?: string
}

/** Student-safe application payload. Physical room inventory is intentionally excluded. */
export async function getApplicationState(userId: string, matricId: string): Promise<RoomApplicationState> {
  const win = await getActiveWindow()
  const window = win ? { name: win.name, opensAt: win.opensAt.toISOString(), closesAt: win.closesAt.toISOString(), closingSoonHours: win.closingSoonHours } : null
  const ws = win ? windowState({ opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours }, nowMalaysia()) : "not_open"
  const student = await resolveEligibleStudent(userId, matricId)
  if (!student) return { eligible: false, windowState: ws, window, application: null, incomingRequest: null, allocation: null, reason: "Your matric number is not on the current accommodation offer list. Contact the KIZ office if this is incorrect." }

  const [application, incoming, confirmedPair, allocationsPublished] = await Promise.all([
    prisma.roomApplication.findFirst({ where: { applicantId: student.id, deletedAt: null }, include: { roommate: true } }),
    prisma.roomApplication.findFirst({ where: { roommateId: student.id, status: "roommate_pending", deletedAt: null }, include: { applicant: true } }),
    prisma.roomApplication.findFirst({ where: { roommateId: student.id, status: "roommate_confirmed", deletedAt: null }, include: { applicant: true } }),
    areAllocationsPublished(),
  ])
  return {
    eligible: true, windowState: ws, window,
    application: application ? { type: application.type, status: application.status, submittedAt: application.submittedAt.toISOString(), roommate: application.roommate ? { race: application.roommate.race, religion: application.roommate.religion } : null } : confirmedPair ? { type: "double", status: "roommate_confirmed", submittedAt: confirmedPair.submittedAt.toISOString(), roommate: { race: confirmedPair.applicant.race, religion: confirmedPair.applicant.religion } } : null,
    incomingRequest: incoming ? { applicantRace: incoming.applicant.race, applicantReligion: incoming.applicant.religion } : null,
    allocation: allocationsPublished && student.bed ? student.bed.room.number : null,
  }
}

/**
 * Build the full picker payload for a given student. Filters blocks to the
 * student's gender. Occupancy and seat state are derived, never stored.
 */
export async function buildPickerState(
  userId: string,
  matricId: string,
): Promise<PickerState> {
  const now = nowMalaysia()
  const win = await getActiveWindow()
  const windowPayload = win
    ? {
        name: win.name,
        opensAt: win.opensAt.toISOString(),
        closesAt: win.closesAt.toISOString(),
        closingSoonHours: win.closingSoonHours,
      }
    : null

  const student = await resolveEligibleStudent(userId, matricId)
  if (!student) {
    return {
      eligible: false,
      windowState: win
        ? windowState(
            { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
            now,
          )
        : "not_open",
      window: windowPayload,
      blocks: [],
      myPick: null,
      reason:
        "Your matric number isn't on the current accepted-student list. Contact the KIZ office if this is wrong.",
    }
  }

  const ws = win
    ? windowState(
        { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
        now,
      )
    : "not_open"

  const privacy = await getOccupantPrivacy()

  // Blocks for the student's gender, with full room/bed/occupant graph.
  const blocks = await prisma.residenceBlock.findMany({
    where: { gender: student.gender, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      rooms: {
        where: { deletedAt: null },
        orderBy: [{ floor: "asc" }, { sortOrder: "asc" }, { number: "asc" }],
        include: {
          beds: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
            include: { occupant: true },
          },
        },
      },
    },
  })

  let myPick: MyPick | null = null

  const blockViews: BlockView[] = blocks.map((block) => {
    const floorMap = new Map<number, RoomView[]>()

    for (const room of block.rooms) {
      const total = room.beds.length
      const occupied = room.beds.filter((b) => b.occupantId).length
      const mineHere = room.beds.some((b) => b.occupantId === student.id)

      const beds: BedView[] = room.beds.map((bed) => {
        const isMe = bed.occupantId === student.id
        if (isMe && bed.occupant) {
          myPick = {
            bedId: bed.id,
            roomId: room.id,
            roomNumber: room.number,
            blockName: block.name,
            position: bed.position,
          }
        }
        // In `limited` mode, peers only see short name + nationality. Students
        // always see their own full details regardless of the setting.
        const limited = privacy === "limited" && !isMe
        return {
          id: bed.id,
          position: bed.position,
          occupant: bed.occupant
            ? {
                shortName: shortName(bed.occupant.name),
                matricId: limited ? null : bed.occupant.matricId,
                religion: limited ? null : bed.occupant.religion,
                race: limited ? null : bed.occupant.race,
                nationality: bed.occupant.nationality,
                isMe,
              }
            : null,
        }
      })

      const seat = roomSeatState({
        roomStatus: room.status,
        windowState: ws,
        totalBeds: total,
        occupiedBeds: occupied,
        mineHere,
      })

      const view: RoomView = {
        id: room.id,
        number: room.number,
        floor: room.floor,
        type: room.type,
        status: room.status,
        beds,
        seat,
      }
      const arr = floorMap.get(room.floor) ?? []
      arr.push(view)
      floorMap.set(room.floor, arr)
    }

    const floors = Array.from(floorMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([floor, rooms]) => ({ floor, rooms }))

    return { id: block.id, name: block.name, gender: block.gender, floors }
  })

  return {
    eligible: true,
    windowState: ws,
    window: windowPayload,
    blocks: blockViews,
    myPick,
  }
}

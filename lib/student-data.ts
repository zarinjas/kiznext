import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"
import { roomAssignmentLabel } from "@/lib/bilik-format"
import { getCheckInStatusForMatrics } from "@/lib/checkin"
import { getSheetLastSyncedAt } from "@/lib/google-sheets"
import { classifyCohort, resolveCurrentPrefix, COHORT_LABELS, type Cohort } from "@/lib/student-cohort"

/**
 * Read-only student analytics for the admin "Student Data" page. Aggregates the
 * active intake (which mirrors the Google Sheet) with the check-in records and
 * the linked app accounts. Server-only.
 */

export type StudentCohort = Cohort | "unknown"
export type CheckInStatusValue = "checked_in" | "checked_out" | "not_checked_in"

const COHORT_ORDER: StudentCohort[] = ["junior", "senior", "postgrad", "unknown"]

const COHORT_LABEL: Record<StudentCohort, string> = {
  ...COHORT_LABELS,
  unknown: "Unknown",
}

export interface StudentRow {
  id: string
  matricId: string
  name: string
  cohort: StudentCohort
  gender: string
  faculty: string | null
  nationality: string
  block: string | null
  room: string | null
  isRegistered: boolean
  checkInStatus: CheckInStatusValue
  hasAccount: boolean
  accountStatus: string | null
}

export interface CohortStat {
  cohort: StudentCohort
  label: string
  total: number
  registered: number
  notRegistered: number
  checkedIn: number
  notCheckedIn: number
  withRoom: number
  withoutRoom: number
  withAccount: number
}

export interface BreakdownRow {
  key: string
  total: number
  registered: number
  checkedIn: number
}

export interface StudentData {
  generatedAt: string
  intakeName: string | null
  currentPrefix: number | null
  lastSyncedAt: string | null
  totals: {
    total: number
    registered: number
    notRegistered: number
    checkedIn: number
    notCheckedIn: number
    withRoom: number
    withoutRoom: number
    withAccount: number
  }
  cohorts: CohortStat[]
  byBlock: BreakdownRow[]
  byGender: BreakdownRow[]
  byFaculty: BreakdownRow[]
  byNationality: BreakdownRow[]
  students: StudentRow[]
}

function emptyCohort(cohort: StudentCohort): CohortStat {
  return {
    cohort,
    label: COHORT_LABEL[cohort],
    total: 0,
    registered: 0,
    notRegistered: 0,
    checkedIn: 0,
    notCheckedIn: 0,
    withRoom: 0,
    withoutRoom: 0,
    withAccount: 0,
  }
}

/** Accumulate a breakdown map into sorted rows (highest total first). */
function toBreakdown(map: Map<string, BreakdownRow>): BreakdownRow[] {
  return [...map.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
}

function bump(map: Map<string, BreakdownRow>, key: string, registered: boolean, checkedIn: boolean) {
  const row = map.get(key) ?? { key, total: 0, registered: 0, checkedIn: 0 }
  row.total += 1
  if (registered) row.registered += 1
  if (checkedIn) row.checkedIn += 1
  map.set(key, row)
}

export async function getStudentData(): Promise<StudentData> {
  const intake = await prisma.intake.findFirst({
    where: { status: "active", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  const students = intake
    ? await prisma.eligibleStudent.findMany({
        where: { intakeId: intake.id, deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          bed: { include: { room: { include: { block: true } } } },
          user: { select: { accountStatus: true } },
        },
      })
    : []

  const currentPrefix = resolveCurrentPrefix(students.map((s) => s.matricId))
  const checkInStatus = await getCheckInStatusForMatrics(students.map((s) => s.matricId))
  const lastSyncedAt = await getSheetLastSyncedAt()

  const cohortMap = new Map<StudentCohort, CohortStat>(COHORT_ORDER.map((c) => [c, emptyCohort(c)]))
  const byBlock = new Map<string, BreakdownRow>()
  const byGender = new Map<string, BreakdownRow>()
  const byFaculty = new Map<string, BreakdownRow>()
  const byNationality = new Map<string, BreakdownRow>()

  const rows: StudentRow[] = students.map((s) => {
    const cohort = (classifyCohort(s.matricId, currentPrefix, s.yearOfStudy) ?? "unknown") as StudentCohort
    const status = checkInStatus[s.matricId.toUpperCase()] ?? "not_checked_in"
    const checkedIn = status === "checked_in" || status === "checked_out"
    const hasRoom = s.bed != null
    const hasAccount = s.userId != null

    const stat = cohortMap.get(cohort)!
    stat.total += 1
    if (s.isRegistered) stat.registered += 1
    else stat.notRegistered += 1
    if (checkedIn) stat.checkedIn += 1
    else stat.notCheckedIn += 1
    if (hasRoom) stat.withRoom += 1
    else stat.withoutRoom += 1
    if (hasAccount) stat.withAccount += 1

    bump(byBlock, s.bed?.room.block.name ?? "Unassigned", s.isRegistered, checkedIn)
    bump(byGender, s.gender, s.isRegistered, checkedIn)
    bump(byFaculty, s.faculty?.trim() || "—", s.isRegistered, checkedIn)
    bump(byNationality, s.nationality?.trim() || "—", s.isRegistered, checkedIn)

    return {
      id: s.id,
      matricId: s.matricId,
      name: s.name,
      cohort,
      gender: s.gender,
      faculty: s.faculty,
      nationality: s.nationality,
      block: s.bed?.room.block.name ?? null,
      room: s.bed
        ? roomAssignmentLabel({
            blockName: s.bed.room.block.name,
            number: s.bed.room.number,
            position: s.bed.position,
          })
        : null,
      isRegistered: s.isRegistered,
      checkInStatus: status,
      hasAccount,
      accountStatus: s.user?.accountStatus ?? null,
    }
  })

  const cohorts = COHORT_ORDER.map((c) => cohortMap.get(c)!)
  const total = rows.length
  const registered = rows.filter((r) => r.isRegistered).length
  const checkedIn = rows.filter((r) => r.checkInStatus === "checked_in" || r.checkInStatus === "checked_out").length

  return {
    generatedAt: nowMalaysia().toISOString(),
    intakeName: intake?.name ?? null,
    currentPrefix,
    lastSyncedAt: lastSyncedAt ? lastSyncedAt.toISOString() : null,
    totals: {
      total,
      registered,
      notRegistered: total - registered,
      checkedIn,
      notCheckedIn: total - checkedIn,
      withRoom: rows.filter((r) => r.room != null).length,
      withoutRoom: rows.filter((r) => r.room == null).length,
      withAccount: rows.filter((r) => r.hasAccount).length,
    },
    cohorts,
    byBlock: toBreakdown(byBlock),
    byGender: toBreakdown(byGender),
    byFaculty: toBreakdown(byFaculty),
    byNationality: toBreakdown(byNationality),
    students: rows,
  }
}

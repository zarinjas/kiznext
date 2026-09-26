"use server"

import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, RESIDENCE_MANAGE_ROLES, RESIDENCE_VIEW_ROLES, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { saveUpload } from "@/lib/image-upload"
import { nowMalaysia, formatMalaysia } from "@/lib/timezone"
import { roomAssignmentLabel } from "@/lib/bilik-format"
import { cleanMatric } from "@/lib/room-selection"
import { getActiveIntake } from "@/lib/bilik"

const ADMIN: Role[] = RESIDENCE_MANAGE_ROLES
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024

export type CheckInTypeValue = "check_in" | "check_out"

async function requireAdmin() {
  const session = await auth()
  requireRole(session?.user?.role as Role | undefined, ADMIN)
  return session!
}

/** Resolve the active session behind a QR token, or a helpful error. */
async function resolveSession(token: string) {
  const session = await prisma.checkInSession.findFirst({
    where: { token, deletedAt: null, isActive: true },
    select: { id: true, name: true, type: true, opensAt: true, closesAt: true },
  })
  if (!session) {
    return { error: "This QR code is not active right now. Check with the KIZ counter." as const }
  }
  const now = new Date()
  if (session.opensAt && now < session.opensAt) {
    return {
      error: `This session hasn't opened yet. It opens at ${formatMalaysia(session.opensAt)}.`,
    } as const
  }
  if (session.closesAt && now > session.closesAt) {
    return {
      error: `This session closed on ${formatMalaysia(session.closesAt)}. Check with the KIZ counter.`,
    } as const
  }
  return { session }
}

function roomOfStudent(student: {
  bed: {
    room: { block: { name: string }; number: string }
    position: string
  } | null
}): string | null {
  if (!student.bed) return null
  return roomAssignmentLabel({
    blockName: student.bed.room.block.name,
    number: student.bed.room.number,
    position: student.bed.position,
  })
}

/** Decode a PNG signature data URL into a buffer, or null when it isn't one. */
function parseSignature(signatureDataUrl: string): Buffer | null {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec((signatureDataUrl ?? "").trim())
  if (!match) return null
  const buffer = Buffer.from(match[1].replace(/\s/g, ""), "base64")
  return buffer.length === 0 ? null : buffer
}

/**
 * Shared transaction: verify the student is on the active intake, has a room,
 * hasn't signed this session yet, then store the signature PNG + record.
 * Used by both the public QR flow and the signed-in app flow.
 */
async function recordSignedCheckIn(input: {
  sessionId: string
  type: CheckInTypeValue
  matricId: string
  signatureBuffer: Buffer
}): Promise<{ matricId: string; name: string; roomLabel: string; signedAt: Date }> {
  const intake = await getActiveIntake()
  if (!intake) throw new Error("The KIZ student list isn't ready yet — try again later.")

  return prisma.$transaction(async (tx) => {
    const student = await tx.eligibleStudent.findFirst({
      where: { intakeId: intake.id, matricId: input.matricId, deletedAt: null },
      include: { bed: { include: { room: { include: { block: true } } } } },
    })
    if (!student) {
      throw new Error("That Matric No. isn't on the current KIZ list. Double-check it, or ask at the counter.")
    }
    const roomLabel = roomOfStudent(student)
    if (!roomLabel) {
      throw new Error("You don't have a room assigned yet — check at the KIZ office before checking in.")
    }

    const existing = await tx.checkInRecord.findFirst({
      where: { sessionId: input.sessionId, eligibleStudentId: student.id, deletedAt: null },
      select: { id: true },
    })
    if (existing) throw new Error("You've already signed for this session.")

    const saved = await saveUpload(input.signatureBuffer, {
      dir: "signatures",
      prefix: `sig-${student.matricId.toLowerCase()}`,
      maxBytes: SIGNATURE_MAX_BYTES,
    })

    const record = await tx.checkInRecord.create({
      data: {
        sessionId: input.sessionId,
        eligibleStudentId: student.id,
        matricId: student.matricId,
        name: student.name,
        type: input.type,
        roomLabel,
        signatureUrl: saved.url,
        signedAt: nowMalaysia(),
      },
      select: { signedAt: true },
    })

    return { matricId: student.matricId, name: student.name, roomLabel, signedAt: record.signedAt }
  })
}

// ── Public (QR flow) ───────────────────────────────────────────────────────

export interface SessionLookup {
  ok: boolean
  name?: string
  type?: CheckInTypeValue
  opensAt?: string | null
  closesAt?: string | null
  error?: string
}

export async function getCheckInSession(token: string): Promise<SessionLookup> {
  const clean = (token ?? "").trim()
  if (!clean) return { ok: false, error: "Missing QR code." }
  const res = await resolveSession(clean)
  if (res.error) return { ok: false, error: res.error }
  return {
    ok: true,
    name: res.session.name,
    type: res.session.type as CheckInTypeValue,
    opensAt: res.session.opensAt ? res.session.opensAt.toISOString() : null,
    closesAt: res.session.closesAt ? res.session.closesAt.toISOString() : null,
  }
}

export interface StudentLookup {
  ok: boolean
  /** Whether the caller has not signed this session yet. */
  canSign: boolean
  /** Whether this matric already has a (loginable) KIZ app account. */
  hasAccount: boolean
  name?: string
  matricId?: string
  roomLabel?: string | null
  error?: string
}

/** Public: find the student behind a Matric No. for an active session. */
export async function lookupCheckInStudent(
  token: string,
  matricRaw: string,
): Promise<StudentLookup> {
  const res = await resolveSession((token ?? "").trim())
  if (res.error) return { ok: false, canSign: false, hasAccount: false, error: res.error }

  const matricId = cleanMatric(matricRaw)
  if (!matricId) return { ok: false, canSign: false, hasAccount: false, error: "Enter your Matric No. first." }

  const intake = await getActiveIntake()
  if (!intake) {
    return { ok: false, canSign: false, hasAccount: false, error: "The KIZ student list isn't ready yet — try again later." }
  }

  const student = await prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId, deletedAt: null },
    include: { bed: { include: { room: { include: { block: true } } } } },
  })
  if (!student) {
    return { ok: false, canSign: false, hasAccount: false, error: "That Matric No. isn't on the current KIZ list. Double-check it, or ask at the counter." }
  }

  const existing = await prisma.checkInRecord.findFirst({
    where: { sessionId: res.session.id, eligibleStudentId: student.id, deletedAt: null },
    select: { id: true },
  })

  // A loginable account (email verified) means the student must sign in before
  // checking in — unverified accounts can't log in, so they check in as walk-in.
  const account = await prisma.user.findFirst({
    where: { matricId, deletedAt: null, accountStatus: { not: "unverified" } },
    select: { id: true },
  })

  return {
    ok: true,
    canSign: !existing,
    hasAccount: Boolean(account),
    name: student.name,
    matricId: student.matricId,
    roomLabel: roomOfStudent(student),
  }
}

export interface SubmitResult {
  ok: boolean
  error?: string
  matricId?: string
  name?: string
  roomLabel?: string | null
  type?: CheckInTypeValue
  signedAtIso?: string
}

/** Public: save a signed check-in / check-out record for this session. */
export async function submitCheckInRecord(
  token: string,
  matricRaw: string,
  signatureDataUrl: string,
): Promise<SubmitResult> {
  const res = await resolveSession((token ?? "").trim())
  if (res.error) return { ok: false, error: res.error }

  const matricId = cleanMatric(matricRaw)
  if (!matricId) return { ok: false, error: "Enter your Matric No. first." }

  const buffer = parseSignature(signatureDataUrl)
  if (!buffer) return { ok: false, error: "Please sign in the box before submitting." }

  try {
    const result = await recordSignedCheckIn({
      sessionId: res.session.id,
      type: res.session.type as CheckInTypeValue,
      matricId,
      signatureBuffer: buffer,
    })

    return {
      ok: true,
      ...result,
      type: res.session.type as CheckInTypeValue,
      signedAtIso: result.signedAt.toISOString(),
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save your signature — try again." }
  }
}

// ── Signed-in app flow (no QR needed) ───────────────────────────────────────

export interface OpenCheckInSession {
  id: string
  name: string
  type: CheckInTypeValue
  opensAtIso: string | null
  closesAtIso: string | null
}

/** Admin-open, currently-valid check-in sessions (normally just one). */
export async function getOpenCheckInSessions(): Promise<OpenCheckInSession[]> {
  const now = new Date()
  const sessions = await prisma.checkInSession.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      AND: [
        { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
        { OR: [{ closesAt: null }, { closesAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, type: true, opensAt: true, closesAt: true },
  })
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type as CheckInTypeValue,
    opensAtIso: s.opensAt ? s.opensAt.toISOString() : null,
    closesAtIso: s.closesAt ? s.closesAt.toISOString() : null,
  }))
}

export interface StudentCheckInOverview {
  ok: boolean
  error?: string
  /** The open session to act on, or null when the office hasn't opened one. */
  session: OpenCheckInSession | null
  name: string | null
  matricId: string | null
  roomLabel: string | null
  alreadySigned: boolean
}

/**
 * Signed-in student's check-in state for the in-app flow. Identity comes from
 * the session — the student never types a matric here.
 */
export async function getStudentCheckInOverview(): Promise<StudentCheckInOverview> {
  const session = await auth()
  if (!session?.user) {
    return { ok: false, error: "Please sign in again.", session: null, name: null, matricId: null, roomLabel: null, alreadySigned: false }
  }

  const matricId = session.user.matricId
  const [sessions, intake] = await Promise.all([getOpenCheckInSessions(), getActiveIntake()])
  const active = sessions[0] ?? null

  const student = intake
    ? await prisma.eligibleStudent.findFirst({
        where: { intakeId: intake.id, matricId, deletedAt: null },
        include: { bed: { include: { room: { include: { block: true } } } } },
      })
    : null

  const alreadySigned =
    active && student
      ? Boolean(
          await prisma.checkInRecord.findFirst({
            where: { sessionId: active.id, eligibleStudentId: student.id, deletedAt: null },
            select: { id: true },
          }),
        )
      : false

  return {
    ok: true,
    session: active,
    name: student?.name ?? session.user.name ?? null,
    matricId,
    roomLabel: student ? roomOfStudent(student) : null,
    alreadySigned,
  }
}

/**
 * Signed-in student checks in / out from the app. No QR token: the active
 * session is resolved server-side and the identity comes from the session.
 */
export async function submitOwnCheckIn(signatureDataUrl: string): Promise<SubmitResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, error: "Please sign in again." }
  if (session.user.role !== "ahli") {
    return { ok: false, error: "Only students can check in from the app. Please use the counter QR." }
  }

  const buffer = parseSignature(signatureDataUrl)
  if (!buffer) return { ok: false, error: "Please sign in the box before submitting." }

  const active = (await getOpenCheckInSessions())[0]
  if (!active) {
    return { ok: false, error: "No check-in session is open right now. Check with the KIZ counter." }
  }

  try {
    const result = await recordSignedCheckIn({
      sessionId: active.id,
      type: active.type,
      matricId: session.user.matricId,
      signatureBuffer: buffer,
    })

    revalidatePath(`/${session.user.role}`)
    revalidatePath(`/${session.user.role}/checkin`)
    return { ok: true, ...result, type: active.type, signedAtIso: result.signedAt.toISOString() }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save your signature — try again." }
  }
}

// ── Admin (session management) ──────────────────────────────────────────────

function parseOptionalDate(value: string | null | undefined, label: string): { date: Date | null } | { error: string } {
  if (!value || !value.trim()) return { date: null }
  const d = new Date(value)
  if (isNaN(d.getTime())) return { error: `${label} isn't a valid date/time.` }
  return { date: d }
}

export async function createCheckInSession(input: {
  name: string
  type: CheckInTypeValue
  opensAt?: string | null
  closesAt?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await requireAdmin()
  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Give the session a name (e.g. Move-in Long Sem 1 2026/2027)." }
  if (input.type !== "check_in" && input.type !== "check_out") {
    return { ok: false, error: "Pick a session type." }
  }

  const opens = parseOptionalDate(input.opensAt, "Opening time")
  if ("error" in opens) return { ok: false, error: opens.error }
  const closes = parseOptionalDate(input.closesAt, "Closing time")
  if ("error" in closes) return { ok: false, error: closes.error }
  if (opens.date && closes.date && opens.date >= closes.date) {
    return { ok: false, error: "The closing time must be after the opening time." }
  }

  const token = randomBytes(16).toString("hex")
  const created = await prisma.checkInSession.create({
    data: {
      name,
      type: input.type,
      token,
      opensAt: opens.date,
      closesAt: closes.date,
      isActive: true,
      createdById: session.user.id,
    },
    select: { id: true },
  })

  revalidatePath(`/${session.user.role}/urus-checkin`)
  return { ok: true, id: created.id }
}

/** Edit a session's name and validity window (the QR token never changes). */
export async function updateCheckInSession(input: {
  id: string
  name: string
  opensAt?: string | null
  closesAt?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin()
  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Give the session a name." }

  const opens = parseOptionalDate(input.opensAt, "Opening time")
  if ("error" in opens) return { ok: false, error: opens.error }
  const closes = parseOptionalDate(input.closesAt, "Closing time")
  if ("error" in closes) return { ok: false, error: closes.error }
  if (opens.date && closes.date && opens.date >= closes.date) {
    return { ok: false, error: "The closing time must be after the opening time." }
  }

  await prisma.checkInSession.updateMany({
    where: { id: input.id, deletedAt: null },
    data: { name, opensAt: opens.date, closesAt: closes.date },
  })

  revalidatePath(`/${session.user.role}/urus-checkin`)
  return { ok: true }
}

export async function setCheckInSessionActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin()
  await prisma.checkInSession.updateMany({
    where: { id, deletedAt: null },
    data: { isActive },
  })
  revalidatePath(`/${session.user.role}/urus-checkin`)
  return { ok: true }
}

/** Soft-delete a session (e.g. a test QR). Signed records are kept. */
export async function deleteCheckInSession(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin()
  await prisma.checkInSession.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  revalidatePath(`/${session.user.role}/urus-checkin`)
  return { ok: true }
}

// ── Admin: manual check-in / check-out on a student's behalf ─────────────────

export interface AdminStudentLookup {
  ok: boolean
  eligibleStudentId?: string
  name?: string
  matricId?: string
  roomLabel?: string | null
  error?: string
}

/** Admin: resolve a student by matric for the manual check-in dialog. */
export async function adminLookupStudent(matricRaw: string): Promise<AdminStudentLookup> {
  await requireAdmin()
  const matricId = cleanMatric(matricRaw)
  if (!matricId) return { ok: false, error: "Enter a Matric No." }

  const intake = await getActiveIntake()
  if (!intake) return { ok: false, error: "No active intake — import the student list first." }

  const student = await prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId, deletedAt: null },
    include: { bed: { include: { room: { include: { block: true } } } } },
  })
  if (!student) return { ok: false, error: "That Matric No. isn't on the active KIZ list." }

  return {
    ok: true,
    eligibleStudentId: student.id,
    name: student.name,
    matricId: student.matricId,
    roomLabel: roomOfStudent(student),
  }
}

/**
 * Admin: record a check-in / check-out on a student's behalf (no signature).
 * The record's type follows the chosen session's type.
 */
export async function adminManualCheckIn(input: {
  matricId: string
  sessionId: string
}): Promise<{ ok: boolean; error?: string; type?: CheckInTypeValue; roomLabel?: string | null }> {
  const admin = await requireAdmin()
  const matricId = cleanMatric(input.matricId)
  if (!matricId) return { ok: false, error: "Enter a Matric No." }

  const checkSession = await prisma.checkInSession.findFirst({
    where: { id: input.sessionId, deletedAt: null },
    select: { id: true, type: true, name: true },
  })
  if (!checkSession) return { ok: false, error: "Pick a session first." }

  const intake = await getActiveIntake()
  if (!intake) return { ok: false, error: "No active intake — import the student list first." }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.eligibleStudent.findFirst({
        where: { intakeId: intake.id, matricId, deletedAt: null },
        include: { bed: { include: { room: { include: { block: true } } } } },
      })
      if (!student) throw new Error("That Matric No. isn't on the active KIZ list.")

      const roomLabel = roomOfStudent(student)
      if (!roomLabel) throw new Error("That student has no room assigned yet.")

      const existing = await tx.checkInRecord.findFirst({
        where: { sessionId: checkSession.id, eligibleStudentId: student.id, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        throw new Error(`${student.name} already has a ${checkSession.type === "check_in" ? "check-in" : "check-out"} for ${checkSession.name}.`)
      }

      await tx.checkInRecord.create({
        data: {
          sessionId: checkSession.id,
          eligibleStudentId: student.id,
          matricId: student.matricId,
          name: student.name,
          type: checkSession.type,
          roomLabel,
          signatureUrl: null,
          manualById: admin.user.id,
          signedAt: nowMalaysia(),
        },
      })

      return { roomLabel, type: checkSession.type as CheckInTypeValue }
    })

    revalidatePath(`/${admin.user.role}/urus-checkin`)
    return { ok: true, ...result }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not record the check-in." }
  }
}

// ── Admin: undo a check-in / check-out record ───────────────────────────────

/**
 * Admin: soft-delete a single signed record (e.g. a student signed on a
 * friend's behalf). The record is kept for the audit trail but drops out of the
 * Records tab and the student's status flips back to "not checked in".
 */
export async function adminDeleteCheckInRecord(recordId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin()
  const id = (recordId ?? "").trim()
  if (!id) return { ok: false, error: "Missing record." }

  const record = await prisma.checkInRecord.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, type: true },
  })
  if (!record) return { ok: false, error: "That record no longer exists." }

  await prisma.checkInRecord.update({
    where: { id: record.id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${admin.user.role}/urus-checkin`)
  return { ok: true }
}

// ── Admin: live record version (for the auto-refreshing Records tab) ─────────

/**
 * Lightweight polling target for the admin Records tab. Returns the newest
 * signed timestamp plus the live record count so the client can detect a
 * student check-in and refresh without re-fetching the whole page. Read-only.
 */
export async function getCheckInRecordsVersion(): Promise<{ latest: string | null; count: number }> {
  const session = await auth()
  requireRole(session?.user?.role as Role | undefined, RESIDENCE_VIEW_ROLES)

  const [latest, count] = await Promise.all([
    prisma.checkInRecord.findFirst({
      where: { deletedAt: null },
      orderBy: { signedAt: "desc" },
      select: { signedAt: true },
    }),
    prisma.checkInRecord.count({ where: { deletedAt: null } }),
  ])

  return { latest: latest ? latest.signedAt.toISOString() : null, count }
}

// ── Counter directions image (shown after a successful scan) ────────────────

const DIRECTIONS_IMAGE_KEY = "checkin_directions_image"
const DIRECTIONS_IMAGE_MAX_BYTES = 8 * 1024 * 1024

/** Public: the uploaded "go to Counter 2" directions image, or null. */
export async function getCheckinDirectionsImage(): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: DIRECTIONS_IMAGE_KEY } })
  return row?.value ?? null
}

export async function uploadCheckinDirectionsImage(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const session = await requireAdmin()
    const file = formData.get("image") as File | null
    if (!file || file.size === 0) return { ok: false, error: "No file selected." }

    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      dir: "checkin",
      prefix: "directions",
      maxBytes: DIRECTIONS_IMAGE_MAX_BYTES,
    })

    await prisma.appSetting.upsert({
      where: { key: DIRECTIONS_IMAGE_KEY },
      update: { value: result.url },
      create: { key: DIRECTIONS_IMAGE_KEY, value: result.url },
    })

    revalidatePath(`/${session.user.role}/urus-checkin`)
    return { ok: true, url: result.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." }
  }
}

export async function removeCheckinDirectionsImage(): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdmin()
    await prisma.appSetting.deleteMany({ where: { key: DIRECTIONS_IMAGE_KEY } })
    revalidatePath(`/${session.user.role}/urus-checkin`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not remove the image." }
  }
}

// ── Status lookup (for the student list + dashboard badges) ──────────────────

export type CheckInStatusValue = "checked_out" | "checked_in" | "not_checked_in"

/**
 * Resolve check-in / check-out status for a set of matric numbers, scoped to
 * the **latest session of each type** (so a badge keeps showing after the office
 * deactivates move-in and starts move-out). A new session per semester naturally
 * resets everyone to "not checked in". Server-only.
 */
export async function getCheckInStatusForMatrics(
  matricIds: string[],
): Promise<Record<string, CheckInStatusValue>> {
  const matrics = [...new Set((matricIds ?? []).map((m) => cleanMatric(m)).filter(Boolean))]
  const result: Record<string, CheckInStatusValue> = {}
  for (const m of matrics) result[m] = "not_checked_in"
  if (matrics.length === 0) return result

  const [inSession, outSession] = await Promise.all([
    prisma.checkInSession.findFirst({
      where: { type: "check_in", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.checkInSession.findFirst({
      where: { type: "check_out", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ])

  const sessionIds = [inSession?.id, outSession?.id].filter(Boolean) as string[]
  if (sessionIds.length === 0) return result

  const records = await prisma.checkInRecord.findMany({
    where: { deletedAt: null, sessionId: { in: sessionIds }, matricId: { in: matrics } },
    select: { matricId: true, type: true, sessionId: true },
  })

  for (const r of records) {
    const key = r.matricId.toUpperCase()
    if (outSession && r.sessionId === outSession.id && r.type === "check_out") {
      result[key] = "checked_out"
    } else if (inSession && r.sessionId === inSession.id && r.type === "check_in") {
      if (result[key] !== "checked_out") result[key] = "checked_in"
    }
  }
  return result
}

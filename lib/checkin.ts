"use server"

import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { saveUpload } from "@/lib/image-upload"
import { nowMalaysia } from "@/lib/timezone"
import { roomAssignmentLabel } from "@/lib/bilik-format"
import { getActiveIntake } from "@/lib/bilik"

const ADMIN: Role[] = ["superadmin", "admin_kiz"]
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
    select: { id: true, name: true, type: true },
  })
  if (!session) {
    return { error: "This QR code is not active right now. Check with the KIZ counter." as const }
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

// ── Public (QR flow) ───────────────────────────────────────────────────────

export interface SessionLookup {
  ok: boolean
  name?: string
  type?: CheckInTypeValue
  error?: string
}

export async function getCheckInSession(token: string): Promise<SessionLookup> {
  const clean = (token ?? "").trim()
  if (!clean) return { ok: false, error: "Missing QR code." }
  const res = await resolveSession(clean)
  if (res.error) return { ok: false, error: res.error }
  return { ok: true, name: res.session.name, type: res.session.type as CheckInTypeValue }
}

export interface StudentLookup {
  ok: boolean
  /** Whether the caller has not signed this session yet. */
  canSign: boolean
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
  if (res.error) return { ok: false, canSign: false, error: res.error }

  const matricId = (matricRaw ?? "").trim().toUpperCase()
  if (!matricId) return { ok: false, canSign: false, error: "Enter your Matric No. first." }

  const intake = await getActiveIntake()
  if (!intake) {
    return { ok: false, canSign: false, error: "The KIZ student list isn't ready yet — try again later." }
  }

  const student = await prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId, deletedAt: null },
    include: { bed: { include: { room: { include: { block: true } } } } },
  })
  if (!student) {
    return { ok: false, canSign: false, error: "That Matric No. isn't on the current KIZ list. Double-check it, or ask at the counter." }
  }

  const existing = await prisma.checkInRecord.findFirst({
    where: { sessionId: res.session.id, eligibleStudentId: student.id, deletedAt: null },
    select: { id: true },
  })

  return {
    ok: true,
    canSign: !existing,
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

  const matricId = (matricRaw ?? "").trim().toUpperCase()
  if (!matricId) return { ok: false, error: "Enter your Matric No. first." }

  // Signature must be a real PNG data URL within a sane size.
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec((signatureDataUrl ?? "").trim())
  if (!match) return { ok: false, error: "Please sign in the box before submitting." }
  const buffer = Buffer.from(match[1].replace(/\s/g, ""), "base64")
  if (buffer.length === 0) return { ok: false, error: "Please sign in the box before submitting." }

  const intake = await getActiveIntake()
  if (!intake) return { ok: false, error: "The KIZ student list isn't ready yet — try again later." }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.eligibleStudent.findFirst({
        where: { intakeId: intake.id, matricId, deletedAt: null },
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
        where: { sessionId: res.session.id, eligibleStudentId: student.id, deletedAt: null },
        select: { id: true },
      })
      if (existing) {
        throw new Error("You've already signed for this session.")
      }

      const saved = await saveUpload(buffer, { dir: "signatures", prefix: `sig-${matricId.toLowerCase()}`, maxBytes: SIGNATURE_MAX_BYTES })

      const signedAt = nowMalaysia()
      const record = await tx.checkInRecord.create({
        data: {
          sessionId: res.session.id,
          eligibleStudentId: student.id,
          matricId: student.matricId,
          name: student.name,
          type: res.session.type,
          roomLabel,
          signatureUrl: saved.url,
          signedAt,
        },
        select: { signedAt: true },
      })

      return { matricId: student.matricId, name: student.name, roomLabel, signedAt: record.signedAt }
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

// ── Admin (session management) ──────────────────────────────────────────────

export async function createCheckInSession(input: {
  name: string
  type: CheckInTypeValue
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await requireAdmin()
  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Give the session a name (e.g. Move-in Long Sem 1)." }
  if (input.type !== "check_in" && input.type !== "check_out") {
    return { ok: false, error: "Pick a session type." }
  }

  const token = randomBytes(16).toString("hex")
  const created = await prisma.checkInSession.create({
    data: { name, type: input.type, token, isActive: true, createdById: session.user.id },
    select: { id: true },
  })

  revalidatePath(`/${session.user.role}/urus-checkin`)
  return { ok: true, id: created.id }
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

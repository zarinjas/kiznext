import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { appOrigin, sendInvitationEmail } from "@/lib/email"
import type { Role } from "@/lib/rbac"

/**
 * Invitations — a superadmin invites someone to self-register with a chosen
 * role. Unlike `/daftar` (which derives the role from the email domain), an
 * invitation carries its own role and email, so it bypasses the UKM-domain
 * check. A student whose matric is already on the active intake is flagged
 * `resident` — registration then activates + links the account immediately.
 *
 * The raw invite token is emailed; only its SHA-256 hash is stored.
 */

export const INVITE_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000
/** Roles that can be invited. Admin invitations are staff, never residents. */
export const INVITABLE_ROLES: Role[] = ["ahli", "admin_kiz"]

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired"

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export function invitationStatus(invitation: {
  acceptedAt: Date | null
  revokedAt: Date | null
  expiresAt: Date
}): InvitationStatus {
  if (invitation.revokedAt) return "revoked"
  if (invitation.acceptedAt) return "accepted"
  if (invitation.expiresAt.getTime() < Date.now()) return "expired"
  return "pending"
}

/** Matches a matric against the active intake (the "is this person a resident?" check). */
async function eligibleOnActiveIntake(matricId: string) {
  const intake = await prisma.intake.findFirst({ where: { status: "active", deletedAt: null } })
  if (!intake) return null
  return prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId, deletedAt: null },
  })
}

export interface InvitationRecipient {
  email: string
  matricId?: string
  name?: string
}

export interface InvitationResultRow {
  email: string
  ok: boolean
  reason?: string
  resident?: boolean
}

/**
 * Creates (or refreshes) an invitation per recipient and emails the accept
 * link. Each row is handled independently so one bad address never blocks the
 * batch — the per-row outcome is returned for the UI to report.
 */
export async function createAndSendInvitations(opts: {
  role: Role
  recipients: InvitationRecipient[]
  invitedById: string
  inviterName: string
}): Promise<InvitationResultRow[]> {
  const { role, recipients, invitedById, inviterName } = opts
  if (!INVITABLE_ROLES.includes(role)) throw new Error("This role can't be invited.")

  const results: InvitationResultRow[] = []
  const seenEmails = new Set<string>()
  const seenMatrics = new Set<string>()

  for (const raw of recipients) {
    const email = raw.email.trim().toLowerCase()
    const matricId = raw.matricId?.trim().toUpperCase() ?? ""
    const name = raw.name?.trim() ?? ""

    if (!email || !EMAIL_RE.test(email)) {
      results.push({ email: raw.email, ok: false, reason: "Invalid email address" })
      continue
    }
    if (seenEmails.has(email)) {
      results.push({ email, ok: false, reason: "Duplicate in this batch" })
      continue
    }
    seenEmails.add(email)

    if (matricId) {
      if (seenMatrics.has(matricId)) {
        results.push({ email, ok: false, reason: "Duplicate matric No. in this batch" })
        continue
      }
      seenMatrics.add(matricId)
    }

    const existing = await prisma.user.findFirst({
      where: { deletedAt: null, OR: [{ email }, ...(matricId ? [{ matricId }] : [])] },
      select: { id: true },
    })
    if (existing) {
      results.push({ email, ok: false, reason: "Already has a KIZ account" })
      continue
    }

    const resident = role === "ahli" && matricId ? Boolean(await eligibleOnActiveIntake(matricId)) : false

    const rawToken = randomBytes(24).toString("base64url")
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS)

    const pending = await prisma.invitation.findFirst({
      where: { email, deletedAt: null, acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (pending) {
      await prisma.invitation.update({
        where: { id: pending.id },
        data: {
          role,
          matricId: matricId || null,
          name: name || null,
          resident,
          tokenHash: hashToken(rawToken),
          expiresAt,
          invitedById,
          lastSentAt: new Date(),
          sentCount: { increment: 1 },
        },
      })
    } else {
      await prisma.invitation.create({
        data: {
          email,
          role,
          matricId: matricId || null,
          name: name || null,
          resident,
          tokenHash: hashToken(rawToken),
          expiresAt,
          invitedById,
          lastSentAt: new Date(),
          sentCount: 1,
        },
      })
    }

    const acceptUrl = `${appOrigin()}/daftar?invite=${encodeURIComponent(rawToken)}`
    try {
      await sendInvitationEmail({
        to: email,
        name: name || "there",
        role,
        resident,
        matricId: matricId || null,
        inviterName,
        acceptUrl,
      })
      results.push({ email, ok: true, resident })
    } catch (err) {
      results.push({
        email,
        ok: false,
        resident,
        reason: err instanceof Error ? err.message : "Email failed to send",
      })
    }
  }

  return results
}

/** Re-issues the token and re-sends the invitation email. */
export async function resendInvitationEmail(id: string, inviterName: string): Promise<void> {
  const invitation = await prisma.invitation.findUnique({ where: { id } })
  if (!invitation || invitation.deletedAt) throw new Error("Invitation not found")
  if (invitation.revokedAt) throw new Error("This invitation has been revoked")
  if (invitation.acceptedAt) throw new Error("This invitation has already been accepted")

  const rawToken = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_MS)

  await prisma.invitation.update({
    where: { id },
    data: {
      tokenHash: hashToken(rawToken),
      expiresAt,
      lastSentAt: new Date(),
      sentCount: { increment: 1 },
    },
  })

  await sendInvitationEmail({
    to: invitation.email,
    name: invitation.name || "there",
    role: invitation.role as Role,
    resident: invitation.resident,
    matricId: invitation.matricId,
    inviterName,
    acceptUrl: `${appOrigin()}/daftar?invite=${encodeURIComponent(rawToken)}`,
  })
}

export interface InvitationPreview {
  email: string
  name: string | null
  matricId: string | null
  role: Role
  resident: boolean
}

/** Looks up a pending invitation for the `/daftar?invite=` landing page. */
export async function getInvitationPreview(
  rawToken: string,
): Promise<{ ok: true } & InvitationPreview | { ok: false; error: string }> {
  if (!rawToken) return { ok: false, error: "This invitation link is missing its code." }

  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(rawToken) } })
  if (!invitation || invitation.deletedAt) {
    return { ok: false, error: "This invitation link is invalid. Ask the KIZ office for a new one." }
  }
  if (invitation.revokedAt) {
    return { ok: false, error: "This invitation has been revoked. Contact the KIZ management office." }
  }
  if (invitation.acceptedAt) {
    return { ok: false, error: "This invitation has already been used. Sign in instead." }
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This invitation has expired. Ask the KIZ office for a new one." }
  }

  return {
    ok: true,
    email: invitation.email,
    name: invitation.name,
    matricId: invitation.matricId,
    role: invitation.role as Role,
    resident: invitation.resident,
  }
}

/**
 * Resolves a raw invite token to its still-usable row (not used, revoked, or
 * expired). Returns null when the token can no longer be honoured.
 */
export async function resolvePendingInvitation(rawToken: string) {
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(rawToken) } })
  if (!invitation || invitation.deletedAt) return null
  if (invitation.revokedAt || invitation.acceptedAt) return null
  if (invitation.expiresAt.getTime() < Date.now()) return null
  return invitation
}

export async function markInvitationAccepted(id: string, userId: string): Promise<void> {
  await prisma.invitation.update({
    where: { id },
    data: { acceptedAt: new Date(), acceptedById: userId },
  })
}

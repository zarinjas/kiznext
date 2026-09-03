import { createHash, randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { appOrigin, sendVerificationEmail } from "@/lib/email"
import type { AccountStatus, Role } from "@/lib/rbac"

/**
 * Self-service registration & email verification.
 *
 * Identity anchor is the matric ID (unique, the login key). The @ukm.edu.my /
 * @siswa.ukm.edu.my email is an ownership gate + contact, NOT the matching key —
 * the KIZ intake CSV (from eKolej) has no email column, so a student is matched
 * to the official list by matric ID. Email proves "this is a UKM account",
 * matric-on-active-intake proves "this person is a KIZ offer-holder".
 *
 * State machine (see `AccountStatus` in schema.prisma):
 *   unverified → email link not yet clicked (login blocked)
 *   pending    → email verified, but student's matric not yet on an active intake
 *   active     → usable. Reached automatically on email verify (if matched),
 *                on the next login (once the intake is uploaded), or manually by
 *                an admin.
 */

export const STUDENT_EMAIL_DOMAIN = "siswa.ukm.edu.my"
export const STAFF_EMAIL_DOMAIN = "ukm.edu.my"
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
export const MIN_PASSWORD_LENGTH = 8

export function normalizeMatric(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * A student address is `x@siswa.ukm.edu.my`; a staff address is `x@ukm.edu.my`.
 * These suffixes are disjoint (`@ukm.edu.my` never matches a siswa address).
 * Returns the role the email implies, or null if the domain is not a UKM one.
 */
export function roleFromEmail(email: string): { role: "ahli" | "staf" } | null {
  const e = email.trim().toLowerCase()
  const local = e.split("@")[0] ?? ""
  if (!local) return null
  if (e.endsWith(`@${STUDENT_EMAIL_DOMAIN}`)) return { role: "ahli" }
  if (e.endsWith(`@${STAFF_EMAIL_DOMAIN}`)) return { role: "staf" }
  return null
}

export function isStaffDomain(email: string): boolean {
  return roleFromEmail(email)?.role === "staf"
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** Builds a fresh single-use token, stores only its hash, and emails the link. */
export async function issueVerificationTokenAndEmail(user: {
  id: string
  email: string | null
  name: string
  matricId: string
}): Promise<void> {
  if (!user.email) throw new Error("This account has no email address on file")

  const raw = randomBytes(24).toString("base64url")
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS)

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(raw),
      expiresAt,
    },
  })

  const verifyUrl = `${appOrigin()}/sahkan?token=${encodeURIComponent(raw)}`
  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    matricId: user.matricId,
    verifyUrl,
  })
}

export interface RegisterInput {
  matricId: string
  name: string
  email: string
  password: string
}

export type RegisterResult =
  | { ok: true; role: "ahli" | "staf"; message: string; resent?: boolean }
  | { ok: false; error: string; code?: "invalid_email_domain" | "duplicate" | "invalid_input" }

export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  const matricId = normalizeMatric(input.matricId)
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!matricId) return { ok: false, error: "Matric No. is required.", code: "invalid_input" }
  if (name.length < 2) return { ok: false, error: "Enter your full name.", code: "invalid_input" }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, code: "invalid_input" }
  }

  const kind = roleFromEmail(email)
  if (!kind) {
    return {
      ok: false,
      error: `Use your official UKM email — students: @${STUDENT_EMAIL_DOMAIN}, staff: @${STAFF_EMAIL_DOMAIN}.`,
      code: "invalid_email_domain",
    }
  }

  const existing = await prisma.user.findUnique({ where: { matricId } })

  if (existing) {
    if (existing.deletedAt) {
      return { ok: false, error: "This Matric No. was deactivated. Contact the KIZ management office." }
    }
    if (existing.accountStatus === "unverified") {
      // Same person re-submitting before clicking the link — just re-send it.
      try {
        await issueVerificationTokenAndEmail(existing)
      } catch {
        return { ok: false, error: "Couldn't send the verification email right now. Try again in a moment." }
      }
      return {
        ok: true,
        role: existing.role === "staf" ? "staf" : "ahli",
        resent: true,
        message: `A fresh verification email is on its way to ${existing.email}.`,
      }
    }
    return {
      ok: false,
      error: "This Matric No. is already registered — sign in instead.",
      code: "duplicate",
    }
  }

  const emailTaken = await prisma.user.findFirst({ where: { email, deletedAt: null } })
  if (emailTaken) {
    return { ok: false, error: "This email is already registered to another account.", code: "duplicate" }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      matricId,
      name,
      email,
      passwordHash,
      role: kind.role,
      accountStatus: "unverified",
      residentCardQr: matricId,
    },
  })

  try {
    await issueVerificationTokenAndEmail(user)
  } catch {
    return { ok: false, error: "Couldn't send the verification email right now. Try again in a moment." }
  }

  return {
    ok: true,
    role: kind.role,
    message: `Account created! We've sent a verification link to ${email}.`,
  }
}

/** Self-service "resend" from the login screen — the caller's password must match. */
export async function resendVerificationEmail(
  matricId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { matricId: normalizeMatric(matricId) } })
  if (!user || user.deletedAt) return { ok: false, error: "Account not found." }
  if (user.accountStatus !== "unverified") {
    return { ok: false, error: "This account doesn't need email verification." }
  }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return { ok: false, error: "Incorrect password." }

  try {
    await issueVerificationTokenAndEmail(user)
  } catch {
    return { ok: false, error: "Couldn't send the email right now. Try again in a moment." }
  }
  return { ok: true }
}

/** Matches the user's matric against the active intake (the "tally" step). */
async function eligibleOnActiveIntake(matricId: string) {
  const intake = await prisma.intake.findFirst({ where: { status: "active", deletedAt: null } })
  if (!intake) return null
  return prisma.eligibleStudent.findFirst({
    where: { intakeId: intake.id, matricId, deletedAt: null },
  })
}

/**
 * Applies the email verification click. Marks the token used, records
 * `emailVerifiedAt`, then sets the account status:
 *   - staff  → active (no intake requirement)
 *   - student→ active if matched to the active intake, else pending
 * On a match the user's name is backfilled from the official list and the
 * `EligibleStudent` row is linked (identity now "tallies" with the CSV).
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<
  | { ok: true; already: boolean; role: Role; accountStatus: AccountStatus; matricId: string; name: string }
  | { ok: false; error: string }
> {
  if (!rawToken) return { ok: false, error: "This link is missing its verification code." }

  const token = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  })

  if (!token || token.deletedAt) {
    return { ok: false, error: "This link is invalid or has already been used." }
  }
  if (token.usedAt || token.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This link has expired. Sign in and request a new one." }
  }
  if (token.user.deletedAt) {
    return { ok: false, error: "This account is no longer active." }
  }

  const user = token.user

  if (user.emailVerifiedAt) {
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date(), deletedAt: new Date() },
    })
    return {
      ok: true,
      already: true,
      role: user.role,
      accountStatus: user.accountStatus,
      matricId: user.matricId,
      name: user.name,
    }
  }

  const now = new Date()
  const eligible = user.role === "ahli" ? await eligibleOnActiveIntake(user.matricId) : null

  const accountStatus: AccountStatus =
    user.role === "staf" ? "active" : eligible ? "active" : "pending"

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: token.id },
      data: { usedAt: now, deletedAt: now },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: now,
        accountStatus,
        ...(eligible && eligible.name && eligible.name !== user.name ? { name: eligible.name } : {}),
      },
    }),
    ...(eligible && !eligible.userId
      ? [
          prisma.eligibleStudent.update({
            where: { id: eligible.id },
            data: { userId: user.id },
          }),
        ]
      : []),
  ])

  return {
    ok: true,
    already: false,
    role: user.role,
    accountStatus,
    matricId: user.matricId,
    name: eligible?.name ?? user.name,
  }
}

/**
 * Called at login when the session still shows a pending account: if the admin
 * has since uploaded + activated an intake that contains this student's matric,
 * the account is upgraded to active in place (and linked + name backfilled).
 */
export async function autoUpgradePendingUser(userId: string): Promise<AccountStatus> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) return "pending"

  if (user.accountStatus !== "pending" && user.accountStatus !== "unverified") {
    return user.accountStatus
  }

  if (user.role === "staf") {
    await prisma.user.update({ where: { id: user.id }, data: { accountStatus: "active" } })
    return "active"
  }

  const eligible = await eligibleOnActiveIntake(user.matricId)
  if (!eligible) return user.accountStatus

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        accountStatus: "active",
        ...(eligible.name && eligible.name !== user.name ? { name: eligible.name } : {}),
      },
    }),
    ...(eligible.userId
      ? []
      : [prisma.eligibleStudent.update({ where: { id: eligible.id }, data: { userId: user.id } })]),
  ])
  return "active"
}

/**
 * Admin batch reconcile, run when an intake is activated: every eligible row
 * whose owner has already registered is linked to its login account, and every
 * `pending` account on the list is unlocked in one pass. This is what makes a
 * late registration "tally" the moment the office uploads + activates the list.
 */
export async function reconcileIntakeStudents(intakeId: string): Promise<number> {
  const rows = await prisma.eligibleStudent.findMany({
    where: { intakeId, deletedAt: null },
    select: { id: true, matricId: true, name: true, userId: true },
  })
  if (rows.length === 0) return 0

  const users = await prisma.user.findMany({
    where: { matricId: { in: rows.map((r) => r.matricId) }, deletedAt: null },
    select: { id: true, matricId: true, accountStatus: true, role: true },
  })
  const byMatric = new Map(users.map((u) => [u.matricId, u]))

  let changed = 0
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const user = byMatric.get(row.matricId)
      if (!user || user.role !== "ahli") continue
      if (user.accountStatus === "pending") {
        await tx.user.update({
          where: { id: user.id },
          data: { accountStatus: "active", name: row.name },
        })
        changed++
      }
      if (!row.userId) {
        await tx.eligibleStudent.update({
          where: { id: row.id },
          data: { userId: user.id },
        })
      }
    }
  })

  return changed
}

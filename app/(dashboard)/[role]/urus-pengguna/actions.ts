"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES, type Role } from "@/lib/rbac"
import { issueLoginLinkAndEmail, issueVerificationTokenAndEmail } from "@/lib/registration"

/**
 * User management (urus-pengguna) — create, edit, soft-delete, and reset
 * passwords for any account. Guards: only superadmin/admin_kiz/pengetua, and
 * only the superadmin can touch superadmin accounts.
 *
 * These actions return a `UserActionResult` instead of throwing. Next.js
 * redacts the message of any error thrown from a Server Action in production
 * (the client only sees a digest), so a thrown validation error would reach the
 * admin as a generic "Server Components render" message.
 */

export interface UserInput {
  matricId: string
  name: string
  email?: string
  phone?: string
  role: Role
  /** Block a fellow looks after — only persisted for the `fellow` role. */
  block?: string
  /** Office within the `pengetua` role — only persisted for `pengetua`. */
  position?: string
}

export type UserActionResult = { ok: true } | { ok: false; error: string }

function normalizeBlock(role: Role, block?: string): string | null {
  if (role !== "fellow") return null
  return block?.trim() || null
}

function normalizePosition(role: Role, position?: string): string | null {
  if (role !== "pengetua") return null
  const value = position?.trim()
  return value === "pengetua" || value === "timbalan_pengetua" ? value : null
}

function normalizeEmail(email?: string): string | null {
  return email?.trim().toLowerCase() || null
}

function canManageRole(sessionRole: Role, targetRole: Role): boolean {
  if (targetRole === "superadmin") return sessionRole === "superadmin"
  return true
}

async function assertAdmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session
}

/** Turn a thrown error into an admin-facing message without leaking internals. */
function toActionError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code
    if (typeof code === "string" && code.startsWith("P")) {
      if (code === "P2002") {
        const target = (err as { meta?: { target?: unknown } }).meta?.target
        const fields = Array.isArray(target) ? target.join(",") : String(target ?? "")
        if (fields.includes("email")) return "That email is already used by another account."
        if (fields.includes("matric")) return "That matric ID already exists."
        return "One of those details is already used by another account."
      }
      return fallback
    }
  }
  if (err instanceof Error) return err.message
  return fallback
}

/** A live or soft-deleted account already holding this email, if any. */
async function emailClash(email: string | null, exceptId?: string) {
  if (!email) return null
  return prisma.user.findFirst({
    where: { email, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  })
}

export async function createUser(input: UserInput & { password: string }): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role
    if (!canManageRole(sessionRole, input.role)) {
      return { ok: false, error: "Only the Super Admin can create Super Admin accounts" }
    }

    const matricId = input.matricId.trim().toUpperCase()
    const name = input.name.trim()
    const email = normalizeEmail(input.email)
    if (!matricId) return { ok: false, error: "Matric ID is required" }
    if (!name) return { ok: false, error: "Name is required" }
    if (!input.password || input.password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters" }
    }

    const existing = await prisma.user.findUnique({ where: { matricId } })
    if (existing && !existing.deletedAt) {
      return { ok: false, error: `Account ${matricId} already exists` }
    }
    if (await emailClash(email, existing?.id)) {
      return { ok: false, error: "That email is already used by another account." }
    }

    const passwordHash = await bcrypt.hash(input.password, 10)

    if (existing) {
      // A soft-deleted account holds the unique matric ID — restore it instead.
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          phone: input.phone?.trim() || null,
          role: input.role,
          block: normalizeBlock(input.role, input.block),
          position: normalizePosition(input.role, input.position),
          passwordHash,
          residentCardQr: matricId,
          deletedAt: null,
        },
      })
    } else {
      await prisma.user.create({
        data: {
          matricId,
          name,
          email,
          phone: input.phone?.trim() || null,
          role: input.role,
          block: normalizeBlock(input.role, input.block),
          position: normalizePosition(input.role, input.position),
          passwordHash,
          residentCardQr: matricId,
        },
      })
    }

    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't create the account — try again.") }
  }
}

export async function updateUser(id: string, input: UserInput): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }

    if (!canManageRole(sessionRole, target.role) || !canManageRole(sessionRole, input.role)) {
      return { ok: false, error: "Only the Super Admin can manage Super Admin accounts" }
    }
    if (target.role === "superadmin" && input.role !== "superadmin") {
      const superAdmins = await prisma.user.count({ where: { role: "superadmin", deletedAt: null } })
      if (superAdmins <= 1) return { ok: false, error: "Can't demote the last Super Admin account" }
    }

    const name = input.name.trim()
    if (!name) return { ok: false, error: "Name is required" }

    const email = normalizeEmail(input.email)
    if (await emailClash(email, id)) {
      return { ok: false, error: "That email is already used by another account." }
    }

    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        phone: input.phone?.trim() || null,
        role: input.role,
        block: normalizeBlock(input.role, input.block),
        position: normalizePosition(input.role, input.position),
      },
    })

    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't save the changes — try again.") }
  }
}

export async function deleteUser(id: string): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    if (session.user.id === id) return { ok: false, error: "You can't delete your own account" }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }

    if (!canManageRole(sessionRole, target.role)) {
      return { ok: false, error: "Only the Super Admin can delete Super Admin accounts" }
    }
    if (target.role === "superadmin") {
      const superAdmins = await prisma.user.count({ where: { role: "superadmin", deletedAt: null } })
      if (superAdmins <= 1) return { ok: false, error: "Can't delete the last Super Admin account" }
    }

    // The bed is held by the official `eligible_students` record, not the account
    // — release it and unlink so a deleted account stops occupying a room and a
    // later re-registration can relink cleanly.
    const linked = await prisma.eligibleStudent.findMany({ where: { userId: id }, select: { id: true } })
    const studentIds = linked.map((student) => student.id)

    await prisma.$transaction([
      prisma.bed.updateMany({ where: { occupantId: { in: studentIds } }, data: { occupantId: null } }),
      prisma.eligibleStudent.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ])

    revalidatePath(`/${sessionRole}/urus-pengguna`)
    revalidatePath(`/${sessionRole}/urus-bilik`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't delete that account — try again.") }
  }
}

export async function resetUserPassword(id: string, password: string): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }

    if (!canManageRole(sessionRole, target.role)) {
      return { ok: false, error: "Only the Super Admin can reset a Super Admin password" }
    }
    if (!password || password.length < 6) {
      return { ok: false, error: "Password must be at least 6 characters" }
    }

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    })

    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't reset the password — try again.") }
  }
}

/**
 * Self-service accounts land `unverified` (email not clicked) or `pending`
 * (email verified, matric not yet on the KIZ list). This lets an admin unlock a
 * legit account the intake matching hasn't caught — e.g. a resident whose row
 * wasn't in the eKolej export.
 */
export async function activateUser(id: string): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }
    if (!canManageRole(sessionRole, target.role)) {
      return { ok: false, error: "Only the Super Admin can manage Super Admin accounts" }
    }

    await prisma.user.update({
      where: { id },
      data: { accountStatus: "active" },
    })

    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't activate that account — try again.") }
  }
}

/**
 * Emails an admin-created account a one-time link to set its own password and
 * sign in. The recipient needs no knowledge of the password the admin typed.
 */
export async function sendUserLoginLink(id: string): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }
    if (!canManageRole(sessionRole, target.role)) {
      return { ok: false, error: "Only the Super Admin can manage Super Admin accounts" }
    }
    if (target.accountStatus !== "active") {
      return { ok: false, error: "Activate this account before sending a login link" }
    }
    if (!target.email) {
      return { ok: false, error: "Add an email address to this account first" }
    }

    await issueLoginLinkAndEmail(target)
    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't send the login link — try again.") }
  }
}

/** Re-sends the verification email for an account whose link never arrived. */
export async function resendUserVerification(id: string): Promise<UserActionResult> {
  try {
    const session = await assertAdmin()
    const sessionRole = session.user.role as Role

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target || target.deletedAt) return { ok: false, error: "User not found" }
    if (!canManageRole(sessionRole, target.role)) {
      return { ok: false, error: "Only the Super Admin can manage Super Admin accounts" }
    }
    if (target.accountStatus !== "unverified") {
      return { ok: false, error: "This account has already verified its email" }
    }

    await issueVerificationTokenAndEmail(target)
    revalidatePath(`/${sessionRole}/urus-pengguna`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toActionError(err, "Couldn't send the email — try again.") }
  }
}

"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { issueVerificationTokenAndEmail } from "@/lib/registration"

/**
 * User management (urus-pengguna) — create, edit, soft-delete, and reset
 * passwords for any account. Guards: only superadmin/admin_kiz, and only the
 * superadmin can touch superadmin accounts.
 */

export interface UserInput {
  matricId: string
  name: string
  email?: string
  phone?: string
  role: Role
}

const ADMIN_ROLES: Role[] = ["superadmin", "admin_kiz"]

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

export async function createUser(input: UserInput & { password: string }) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role
  if (!canManageRole(sessionRole, input.role)) {
    throw new Error("Only the Super Admin can create Super Admin accounts")
  }

  const matricId = input.matricId.trim().toUpperCase()
  const name = input.name.trim()
  if (!matricId) throw new Error("Matric ID is required")
  if (!name) throw new Error("Name is required")
  if (!input.password || input.password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const existing = await prisma.user.findUnique({ where: { matricId } })

  if (existing && !existing.deletedAt) {
    throw new Error(`Account ${matricId} already exists`)
  }

  if (existing) {
    // A soft-deleted account holds the unique matric ID — restore it instead.
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        role: input.role,
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
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        role: input.role,
        passwordHash,
        residentCardQr: matricId,
      },
    })
  }

  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

export async function updateUser(id: string, input: UserInput) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.deletedAt) throw new Error("User not found")

  if (!canManageRole(sessionRole, target.role) || !canManageRole(sessionRole, input.role)) {
    throw new Error("Only the Super Admin can manage Super Admin accounts")
  }
  if (target.role === "superadmin" && input.role !== "superadmin") {
    const superAdmins = await prisma.user.count({ where: { role: "superadmin", deletedAt: null } })
    if (superAdmins <= 1) throw new Error("Can't demote the last Super Admin account")
  }

  const name = input.name.trim()
  if (!name) throw new Error("Name is required")

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role,
    },
  })

  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

export async function deleteUser(id: string) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role

  if (session.user.id === id) throw new Error("You can't delete your own account")

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.deletedAt) throw new Error("User not found")

  if (!canManageRole(sessionRole, target.role)) {
    throw new Error("Only the Super Admin can delete Super Admin accounts")
  }
  if (target.role === "superadmin") {
    const superAdmins = await prisma.user.count({ where: { role: "superadmin", deletedAt: null } })
    if (superAdmins <= 1) throw new Error("Can't delete the last Super Admin account")
  }

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

export async function resetUserPassword(id: string, password: string) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.deletedAt) throw new Error("User not found")

  if (!canManageRole(sessionRole, target.role)) {
    throw new Error("Only the Super Admin can reset a Super Admin password")
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  })

  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

/**
 * Self-service accounts land `unverified` (email not clicked) or `pending`
 * (email verified, matric not yet on the KIZ list). This lets an admin unlock a
 * legit account the intake matching hasn't caught — e.g. a resident whose row
 * wasn't in the eKolej export.
 */
export async function activateUser(id: string) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.deletedAt) throw new Error("User not found")
  if (!canManageRole(sessionRole, target.role)) {
    throw new Error("Only the Super Admin can manage Super Admin accounts")
  }

  await prisma.user.update({
    where: { id },
    data: { accountStatus: "active" },
  })

  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

/** Re-sends the verification email for an account whose link never arrived. */
export async function resendUserVerification(id: string) {
  const session = await assertAdmin()
  const sessionRole = session.user.role as Role

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target || target.deletedAt) throw new Error("User not found")
  if (!canManageRole(sessionRole, target.role)) {
    throw new Error("Only the Super Admin can manage Super Admin accounts")
  }
  if (target.accountStatus !== "unverified") {
    throw new Error("This account has already verified its email")
  }

  await issueVerificationTokenAndEmail(target)
  revalidatePath(`/${sessionRole}/urus-pengguna`)
}

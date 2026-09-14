"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import {
  createAndSendInvitations,
  resendInvitationEmail,
  type InvitationRecipient,
} from "@/lib/invitations"

/**
 * Invitations (urus-jemputan) — superadmin-only. Sends self-registration
 * invitation emails (single or bulk) with a chosen role, and manages the
 * issued invitations (resend / revoke / delete).
 */

async function assertSuperadmin() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["superadmin"])
  return session
}

export async function sendInvitations(role: Role, recipients: InvitationRecipient[]) {
  const session = await assertSuperadmin()
  if (!recipients.length) throw new Error("Add at least one recipient")

  const results = await createAndSendInvitations({
    role,
    recipients,
    invitedById: session.user.id,
    inviterName: session.user.name ?? "Kolej Ibu Zain",
  })

  revalidatePath(`/${session.user.role}/urus-jemputan`)
  return results
}

export async function resendInvitation(id: string) {
  const session = await assertSuperadmin()
  await resendInvitationEmail(id, session.user.name ?? "Kolej Ibu Zain")
  revalidatePath(`/${session.user.role}/urus-jemputan`)
}

export async function revokeInvitation(id: string) {
  const session = await assertSuperadmin()
  const invitation = await prisma.invitation.findUnique({ where: { id } })
  if (!invitation || invitation.deletedAt) throw new Error("Invitation not found")
  if (invitation.acceptedAt) throw new Error("This invitation has already been accepted")

  await prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } })
  revalidatePath(`/${session.user.role}/urus-jemputan`)
}

export async function deleteInvitation(id: string) {
  const session = await assertSuperadmin()
  const invitation = await prisma.invitation.findUnique({ where: { id } })
  if (!invitation || invitation.deletedAt) throw new Error("Invitation not found")

  await prisma.invitation.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath(`/${session.user.role}/urus-jemputan`)
}

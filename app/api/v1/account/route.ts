import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Self-service account deletion for the mobile app.
 *
 * Mirrors the admin `deleteUser` flow but for the signed-in user only: soft
 * delete (never hard delete), release the room held via `eligible_students`,
 * and revoke every device session + push token so no token outlives the
 * account. Super Admins are blocked here so the last admin can't lock the
 * college out — they must be removed by another Super Admin.
 */
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  if (auth.user.role === "superadmin") {
    return forbidden("Super Admin accounts can't be deleted from the app. Ask another Super Admin to remove it.")
  }

  try {
    const linked = await prisma.eligibleStudent.findMany({
      where: { userId: auth.user.id },
      select: { id: true },
    })
    const studentIds = linked.map((student) => student.id)
    const now = new Date()

    await prisma.$transaction([
      prisma.bed.updateMany({ where: { occupantId: { in: studentIds } }, data: { occupantId: null } }),
      prisma.eligibleStudent.updateMany({ where: { userId: auth.user.id }, data: { userId: null } }),
      prisma.mobileSession.updateMany({
        where: { userId: auth.user.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.deviceToken.updateMany({
        where: { userId: auth.user.id, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.user.update({ where: { id: auth.user.id }, data: { deletedAt: now } }),
    ])

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/account] deletion failed", err)
    return serverError("Couldn't delete your account. Please try again or contact the KIZ office.")
  }
}

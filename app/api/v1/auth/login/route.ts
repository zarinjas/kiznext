import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { cleanMatric } from "@/lib/room-selection"
import { autoUpgradePendingUser } from "@/lib/registration"
import { createMobileSession, badRequest } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/**
 * Mobile sign-in. Mirrors the web Auth.js Credentials provider exactly
 * (matric normalise → soft-delete check → bcrypt → unverified gate → pending
 * auto-upgrade) but returns an opaque bearer token instead of a cookie.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  const rawMatric = typeof body?.matricId === "string" ? body.matricId : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const platform = typeof body?.platform === "string" ? body.platform : "unknown"
  const deviceName = typeof body?.deviceName === "string" ? body.deviceName : undefined

  if (!rawMatric || !password) {
    return badRequest("Enter your matric number and password.")
  }

  const matricId = cleanMatric(rawMatric)

  const user = await prisma.user.findUnique({ where: { matricId } })
  if (!user || user.deletedAt) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Matric number or password is wrong." } },
      { status: 401 }
    )
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    return NextResponse.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Matric number or password is wrong." } },
      { status: 401 }
    )
  }

  if (user.accountStatus === "unverified") {
    return NextResponse.json(
      {
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Click the link we emailed you before signing in.",
        },
      },
      { status: 403 }
    )
  }

  const accountStatus =
    user.accountStatus === "active" ? user.accountStatus : await autoUpgradePendingUser(user.id)

  const { token, expiresAt } = await createMobileSession(user.id, { platform, deviceName })

  return NextResponse.json({
    data: {
      token,
      expiresAt: expiresAt.toISOString(),
      user: {
        id: user.id,
        matricId: user.matricId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        accountStatus,
      },
    },
  })
}

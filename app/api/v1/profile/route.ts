import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  return NextResponse.json({ data: { user: auth.user } })
}

/**
 * Update the signed-in user's profile. Room/block are intentionally NOT
 * editable — a resident's room is assigned by the KIZ office and read from the
 * bed allocation (same rule as the web profile form).
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const phone = typeof body?.phone === "string" ? body.phone.trim() : ""
  const avatarUrl = typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : undefined

  if (!name) return badRequest("Name can't be empty.")
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("That email doesn't look right.")
  }

  try {
    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
      },
    })

    return NextResponse.json({
      data: {
        user: {
          id: updated.id,
          matricId: updated.matricId,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          avatarUrl: updated.avatarUrl,
          role: updated.role,
          accountStatus: updated.accountStatus,
        },
      },
    })
  } catch (err) {
    // P2002 = unique constraint (email already used by another account).
    if (typeof err === "object" && err && (err as { code?: string }).code === "P2002") {
      return badRequest("That email is already used by another account.")
    }
    console.error("[api/v1/profile] update failed", err)
    return serverError("Couldn't save your profile.")
  }
}

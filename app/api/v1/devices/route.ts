import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Register (or refresh) this device's Expo push token. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const platform = typeof body?.platform === "string" ? body.platform : "unknown"
  const deviceName = typeof body?.deviceName === "string" ? body.deviceName : null

  if (!token) return badRequest("Missing push token.")

  try {
    await prisma.deviceToken.upsert({
      where: { token },
      create: { userId: auth.user.id, token, platform, deviceName },
      update: { userId: auth.user.id, platform, deviceName, lastSeenAt: new Date(), deletedAt: null },
    })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/devices] upsert failed", err)
    return serverError("Couldn't register this device.")
  }
}

/** Unregister a device (called on sign-out). `?token=` or JSON body. */
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const fromQuery = req.nextUrl.searchParams.get("token")
  const body = fromQuery ? null : await req.json().catch(() => null)
  const token = fromQuery ?? (typeof body?.token === "string" ? body.token : "")
  if (!token) return badRequest("Missing push token.")

  await prisma.deviceToken.updateMany({
    where: { token, userId: auth.user.id, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ data: { ok: true } })
}

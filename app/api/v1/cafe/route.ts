import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import {
  createCafeOrderForUser,
  getCafeConfig,
  getCafeMenu,
  getCafeOrdersForUser,
} from "@/lib/cafe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * KIZ Cafe smart ordering for the mobile app. GET returns the cafe config +
 * published menu + the caller's recent orders; POST places an order and returns
 * the WhatsApp deep link the app opens. Mirrors the web server actions in
 * `lib/cafe.ts` (identity comes from the bearer token, not a NextAuth session).
 */

export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [config, menu, orders] = await Promise.all([
      getCafeConfig(),
      getCafeMenu(),
      getCafeOrdersForUser(auth.user.id),
    ])
    return NextResponse.json({ data: { config, menu, orders } })
  } catch (err) {
    console.error("[api/v1/cafe] GET failed", err)
    return serverError("Couldn't load the cafe.")
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  let body: { lines?: { itemId: string; qty: number }[]; pickupTime?: string; note?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return badRequest("Invalid request.")
  }

  const lines = Array.isArray(body.lines) ? body.lines : []
  if (lines.length === 0) return badRequest("Your cart is empty.")

  const result = await createCafeOrderForUser(
    { userId: auth.user.id, name: auth.user.name, matricId: auth.user.matricId },
    { lines, pickupTime: body.pickupTime, note: body.note },
  )
  if (!result.success || !result.order) return badRequest(result.error ?? "Couldn't place the order.")

  return NextResponse.json({
    data: {
      refCode: result.order.refCode,
      whatsappUrl: result.order.whatsappUrl,
      message: result.order.message,
    },
  })
}

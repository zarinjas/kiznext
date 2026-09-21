import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { resolveSosTarget } from "@/lib/sos"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * SOS emergency-call payload for the mobile app — the resolved target number for
 * the current time of day plus the static emergency-contact list as a fallback.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [target, contacts] = await Promise.all([
      resolveSosTarget(),
      prisma.contentItem.findMany({
        where: { kind: "emergency_contact", deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, phone: true, subtitle: true },
      }),
    ])
    return NextResponse.json({ data: { target, contacts } })
  } catch (err) {
    console.error("[api/v1/sos] failed", err)
    return serverError("Couldn't load SOS.")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/**
 * First view of the eCard "registers" it, clearing the dashboard checklist
 * task. Idempotent — only writes when it hasn't been set yet.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    await prisma.user.updateMany({
      where: { id: auth.user.id, ecardRegisteredAt: null },
      data: { ecardRegisteredAt: new Date() },
    })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/ecard/register] failed", err)
    return serverError("Couldn't register your eCard.")
  }
}

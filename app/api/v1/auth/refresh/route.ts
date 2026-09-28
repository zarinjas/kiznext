import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Slide the session expiry. The client calls this on cold start; the DB write
 * itself is throttled inside `authenticate()` so this stays cheap.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  return NextResponse.json({ data: { user: auth.user } })
}

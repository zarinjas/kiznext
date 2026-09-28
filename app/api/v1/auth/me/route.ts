import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Current user for the bearer token — the mobile app's session bootstrap. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  return NextResponse.json({ data: { user: auth.user } })
}

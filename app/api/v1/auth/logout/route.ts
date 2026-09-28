import { NextRequest, NextResponse } from "next/server"
import { revokeSessionByRequest } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/** Sign out — soft-deletes the bearer session so the token can't be reused. */
export async function POST(req: NextRequest) {
  await revokeSessionByRequest(req)
  return NextResponse.json({ data: { ok: true } })
}

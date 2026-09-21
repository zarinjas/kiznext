import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { getCheckInSession } from "@/lib/checkin"

export const runtime = "nodejs"

/** Public: resolve a scanned counter-QR token to its check-in session. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!token) return badRequest("Missing QR code.")

  try {
    const result = await getCheckInSession(token)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[api/v1/checkin/scan] failed", err)
    return serverError("Couldn't read that QR code.")
  }
}

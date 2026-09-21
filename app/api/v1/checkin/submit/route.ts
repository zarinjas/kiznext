import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { submitCheckInRecord } from "@/lib/checkin"

export const runtime = "nodejs"

/** Public: save a signed check-in / check-out record for a scanned session. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const matricId = typeof body?.matricId === "string" ? body.matricId : ""
  const signature = typeof body?.signature === "string" ? body.signature : ""

  if (!token) return badRequest("Missing QR code.")
  if (!signature) return badRequest("Please sign in the box before submitting.")

  try {
    const result = await submitCheckInRecord(token, matricId, signature)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[api/v1/checkin/submit] failed", err)
    return serverError("Couldn't save your signature.")
  }
}

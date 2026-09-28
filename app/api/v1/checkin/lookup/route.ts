import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { lookupCheckInStudent } from "@/lib/checkin"

export const runtime = "nodejs"

/** Public: look up the student behind a Matric No. for an active session. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const matricId = typeof body?.matricId === "string" ? body.matricId : ""
  if (!token) return badRequest("Missing QR code.")

  try {
    const result = await lookupCheckInStudent(token, matricId)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[api/v1/checkin/lookup] failed", err)
    return serverError("Couldn't look up that matric number.")
  }
}

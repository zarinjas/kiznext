import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { resendVerificationEmail } from "@/lib/registration"

export const runtime = "nodejs"

/** Re-send the verification email — the caller must supply the right password. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const matricId = typeof body?.matricId === "string" ? body.matricId : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!matricId || !password) return badRequest("Enter your matric No. and password.")

  try {
    const result = await resendVerificationEmail(matricId, password)
    if (!result.ok) return badRequest(result.error ?? "Couldn't resend the email.")
    return NextResponse.json({ data: { ok: true, message: "A fresh verification email is on its way." } })
  } catch (err) {
    console.error("[api/v1/auth/resend-verification] failed", err)
    return serverError("Couldn't resend the email right now.")
  }
}

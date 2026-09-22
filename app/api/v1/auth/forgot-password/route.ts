import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { requestPasswordReset } from "@/lib/registration"

export const runtime = "nodejs"

/**
 * Start the forgot-password flow. The reply is always the same whether or not
 * the matric exists (mirrors the web form — no account enumeration).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const matricId = typeof body?.matricId === "string" ? body.matricId : ""

  if (!matricId.trim()) return badRequest("Enter your Matric No.")

  try {
    const result = await requestPasswordReset(matricId)
    if (!result.ok) return badRequest(result.error)
    return NextResponse.json({ data: { message: result.message } })
  } catch (err) {
    console.error("[api/v1/auth/forgot-password] failed", err)
    return serverError("Couldn't send the reset email right now.")
  }
}

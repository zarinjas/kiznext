import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { registerAccount } from "@/lib/registration"

export const runtime = "nodejs"

/** Self-registration from the mobile app — wraps `registerAccount` (same rules as web). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  const matricId = typeof body?.matricId === "string" ? body.matricId : ""
  const name = typeof body?.name === "string" ? body.name : ""
  const email = typeof body?.email === "string" ? body.email : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken : undefined

  if (!matricId || !name || !email || !password) {
    return badRequest("Fill in your matric No., name, email and password.")
  }

  try {
    const result = await registerAccount({ matricId, name, email, password, inviteToken })
    if (!result.ok) return badRequest(result.error)
    return NextResponse.json({ data: { role: result.role, message: result.message, resent: result.resent ?? false } })
  } catch (err) {
    console.error("[api/v1/auth/register] failed", err)
    return serverError("Couldn't create your account right now.")
  }
}

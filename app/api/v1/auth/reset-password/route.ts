import { NextRequest, NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/mobile-auth"
import { getPasswordResetInfo, resetPasswordWithToken } from "@/lib/registration"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Peek at a reset token so the app can render before the user submits. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? ""
  const info = await getPasswordResetInfo(token)
  if (!info.ok) return badRequest(info.error)
  return NextResponse.json({ data: { name: info.name, matricId: info.matricId } })
}

/** Apply a reset token + new password. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!token || !password) return badRequest("This reset link is missing its code or a new password.")

  try {
    const result = await resetPasswordWithToken(token, password)
    if (!result.ok) return badRequest(result.error)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/auth/reset-password] failed", err)
    return serverError("Couldn't reset your password right now.")
  }
}

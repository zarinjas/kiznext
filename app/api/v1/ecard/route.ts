import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { loadEcardCard } from "@/lib/ecard"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Everything the mobile eCard needs. The QR itself is generated on-device. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const snapshot = await loadEcardCard(auth.user.id)
    if (!snapshot) return unauthorized()

    return NextResponse.json({ data: snapshot })
  } catch (err) {
    console.error("[api/v1/ecard] failed", err)
    return serverError("Couldn't load your eCard.")
  }
}

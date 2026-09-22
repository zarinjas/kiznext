import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { getResidentHomeData } from "@/lib/dashboard"
import { isMemberRole } from "@/lib/rbac"
import { getDashboardHeroBackground } from "@/lib/settings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Member dashboard payload. Returns `home: null` for admin/pengetua roles — the
 * mobile dashboard falls back to the role card + quick links for them.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  if (!isMemberRole(auth.user.role)) {
    const heroBackgroundUrl = await getDashboardHeroBackground()
    return NextResponse.json({ data: { home: null, heroBackgroundUrl } })
  }

  try {
    const [home, heroBackgroundUrl] = await Promise.all([
      getResidentHomeData({
        userId: auth.user.id,
        matricId: auth.user.matricId,
        role: auth.user.role as "ahli" | "staf" | "fellow",
      }),
      getDashboardHeroBackground(),
    ])
    return NextResponse.json({ data: { home, heroBackgroundUrl } })
  } catch (err) {
    console.error("[api/v1/home] failed", err)
    return serverError("Couldn't load your dashboard.")
  }
}

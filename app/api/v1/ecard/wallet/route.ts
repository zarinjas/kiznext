import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { loadEcardCard } from "@/lib/ecard"
import { siteUrl } from "@/lib/site-url"
import { buildGoogleWalletSaveUrl, isGoogleWalletConfigured } from "@/lib/wallet/google"
import { isAppleWalletConfigured, signAppleWalletToken } from "@/lib/wallet/apple"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * "Add to Wallet" links for the current resident's Digital Resident ID.
 *
 * Google returns a self-contained save URL (signed JWT). Apple has no save URL,
 * so we hand back a short-lived signed link to `/api/wallet/apple/<token>`
 * which Safari can fetch without our bearer header. Either value is `null` when
 * that provider isn't configured, and the mobile UI hides the matching button.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const snapshot = await loadEcardCard(auth.user.id)
    if (!snapshot) return unauthorized()

    let googleWalletUrl: string | null = null
    if (isGoogleWalletConfigured()) {
      try {
        googleWalletUrl = buildGoogleWalletSaveUrl(snapshot.card, auth.user.id)
      } catch (err) {
        console.error("[api/v1/ecard/wallet] google build failed", err)
      }
    }

    const appleWalletUrl = isAppleWalletConfigured()
      ? `${siteUrl()}/api/wallet/apple/${signAppleWalletToken(auth.user.id)}`
      : null

    return NextResponse.json({ data: { googleWalletUrl, appleWalletUrl } })
  } catch (err) {
    console.error("[api/v1/ecard/wallet] failed", err)
    return serverError("Couldn't prepare your wallet pass.")
  }
}

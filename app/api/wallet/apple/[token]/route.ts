import { NextResponse } from "next/server"
import { loadEcardCard } from "@/lib/ecard"
import { buildApplePass, isAppleWalletConfigured, verifyAppleWalletToken } from "@/lib/wallet/apple"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Serves the signed `.pkpass` behind a short-lived token (see
 * `signAppleWalletToken`). This endpoint is intentionally outside `/api/v1` —
 * Safari/ios fetches it directly, so it can't require the mobile bearer header.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isAppleWalletConfigured()) {
    return new NextResponse("Apple Wallet is not configured.", { status: 404 })
  }

  const { token } = await params
  const userId = verifyAppleWalletToken(token)
  if (!userId) {
    return new NextResponse("This link is invalid or has expired. Open the app and try again.", {
      status: 401,
    })
  }

  const snapshot = await loadEcardCard(userId)
  if (!snapshot) return new NextResponse("Not found.", { status: 404 })

  try {
    const pass = await buildApplePass(snapshot.card, userId)
    return new NextResponse(new Uint8Array(pass), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": 'attachment; filename="mykiz-resident-id.pkpass"',
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[api/wallet/apple] failed", err)
    return new NextResponse("Couldn't generate the pass.", { status: 500 })
  }
}

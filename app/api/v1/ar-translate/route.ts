import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { getAiConfig } from "@/lib/ai/config"
import { translateImage, isSupportedLang, getSuggestedLang } from "@/lib/ar-translate"
import { AR_LANGUAGES } from "@/lib/ar-translate-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Hard cap on the incoming frame (~6 MB of base64) — the client downscales first. */
const MAX_BASE64 = 8 * 1024 * 1024

/** KIZ Lens languages + the resident's nationality-derived default. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const suggestedLang = await getSuggestedLang(auth.user.id)
    return NextResponse.json({ data: { languages: AR_LANGUAGES, suggestedLang } })
  } catch (err) {
    console.error("[api/v1/ar-translate] GET failed", err)
    return serverError("Couldn't load the translator.")
  }
}

interface ScanBody {
  image?: string
  mimeType?: string
  targetLang?: string
}

/** Translate a camera frame into the requested language (OCR + translate). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  let body: ScanBody
  try {
    body = (await req.json()) as ScanBody
  } catch {
    return badRequest("Invalid request body.")
  }

  const image = (body.image ?? "").trim()
  const targetLang = (body.targetLang ?? "").trim()

  if (!image) return badRequest("No image captured — try again.")
  if (image.length > MAX_BASE64) return badRequest("That image is too large — try again.")
  if (!isSupportedLang(targetLang)) return badRequest("Pick a language first.")

  const ai = await getAiConfig()
  if (!ai.enabled) {
    return NextResponse.json(
      { error: { code: "AI_NOT_CONFIGURED", message: "KIZ Lens needs its AI key configured — ask an admin to set it in App Settings → AI." } },
      { status: 503 }
    )
  }

  try {
    const result = await translateImage({
      imageBase64: image,
      mimeType: body.mimeType || "image/jpeg",
      targetLang,
    })
    if (!result) {
      return NextResponse.json(
        { error: { code: "READ_FAILED", message: "Couldn't read that. Hold steady, get closer, and try again." } },
        { status: 422 }
      )
    }
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[api/v1/ar-translate] POST failed", err)
    return serverError("Couldn't translate that image.")
  }
}

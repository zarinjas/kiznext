"use server"

import { auth } from "@/lib/auth"
import { getAiConfig } from "@/lib/ai/config"
import { translateImage, isSupportedLang, type ArTranslateResult } from "@/lib/ar-translate"

export interface ScanInput {
  /** Base64 JPEG bytes captured from the camera (no data-URL prefix). */
  imageBase64: string
  /** Target language code from AR_LANGUAGES. */
  targetLang: string
  mimeType?: string
}

export type ScanResult = { ok: true; result: ArTranslateResult } | { ok: false; error: string }

/** Hard cap on the incoming frame (~6 MB of base64) — the client downscales first. */
const MAX_BASE64 = 8 * 1024 * 1024

/**
 * Web entry point for KIZ Lens. The client captures a frame, downscales it and
 * sends the base64 here; the shared `translateImage` core does the OCR +
 * translation in one Gemini vision call.
 */
export async function scanTranslate(input: ScanInput): Promise<ScanResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in again." }

  const imageBase64 = (input.imageBase64 ?? "").trim()
  if (!imageBase64) return { ok: false, error: "No image captured — try again." }
  if (imageBase64.length > MAX_BASE64) return { ok: false, error: "That image is too large — try again." }
  if (!isSupportedLang(input.targetLang)) return { ok: false, error: "Pick a language first." }

  const ai = await getAiConfig()
  if (!ai.enabled) {
    return { ok: false, error: "KIZ Lens needs its AI key configured — ask an admin to set it in App Settings → AI." }
  }

  const result = await translateImage({
    imageBase64,
    mimeType: input.mimeType || "image/jpeg",
    targetLang: input.targetLang,
  })

  if (!result) {
    return { ok: false, error: "Couldn't read that. Hold steady, get closer, and try again." }
  }
  return { ok: true, result }
}

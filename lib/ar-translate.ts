import { prisma } from "@/lib/db"
import { getAiConfig } from "@/lib/ai/config"
import { generateJson } from "@/lib/ai/provider"
import {
  AR_TRANSLATE_SYSTEM,
  buildArTranslatePrompt,
  AR_TRANSLATE_RESPONSE_SCHEMA,
} from "@/lib/ai/prompts"
import { AR_LANGUAGE_CODES, findArLanguage, nationalityToLang } from "@/lib/ar-translate-meta"

/**
 * KIZ Lens — AR live translation. One Gemini vision call reads all text in a
 * camera frame AND translates it into the resident's chosen language, returning
 * a bounding box per block so the client can overlay the translation in place.
 *
 * No new dependency: it rides the shared AI provider (Gemini/Ollama). Returns
 * `null` when AI is off or the call fails, so callers can show a friendly retry.
 */

export interface ArTranslateBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ArTranslateBlock {
  /** Original text as it appears in the image. */
  text: string
  /** The translation into the requested language. */
  translation: string
  /** Normalised 0..1 position, or null when the model gave no usable box. */
  box: ArTranslateBox | null
}

export interface ArTranslateResult {
  /** Dominant language of the source text: "ms" | "en" | "mixed". */
  sourceLang: string
  targetLang: string
  blocks: ArTranslateBlock[]
}

interface ArTranslateRawBlock {
  text?: string
  translation?: string
  box?: { x?: number; y?: number; w?: number; h?: number }
}

interface ArTranslateJson {
  sourceLang?: string
  blocks?: ArTranslateRawBlock[]
}

/** Clamp a number into [0, 1]; returns null for anything non-finite. */
function unit(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value))
}

function cleanBox(raw: ArTranslateRawBlock["box"]): ArTranslateBox | null {
  const x = unit(raw?.x)
  const y = unit(raw?.y)
  const w = unit(raw?.w)
  const h = unit(raw?.h)
  if (x == null || y == null || w == null || h == null) return null
  if (w <= 0 || h <= 0) return null
  return { x, y, w, h }
}

export interface TranslateImageInput {
  /** Base64 image bytes (no data-URL prefix). */
  imageBase64: string
  /** e.g. "image/jpeg". */
  mimeType: string
  /** Target language code from AR_LANGUAGES. */
  targetLang: string
}

export async function translateImage(input: TranslateImageInput): Promise<ArTranslateResult | null> {
  const image = (input.imageBase64 ?? "").trim()
  if (!image) return null

  const lang = findArLanguage(input.targetLang)
  if (!lang) return null

  const cfg = await getAiConfig()
  if (!cfg.enabled) return null

  try {
    const result = await generateJson<ArTranslateJson>(cfg, {
      system: AR_TRANSLATE_SYSTEM,
      prompt: buildArTranslatePrompt(lang.english, lang.code),
      image: { mimeType: input.mimeType || "image/jpeg", data: image },
      responseSchema: AR_TRANSLATE_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 2500,
    })

    const blocks: ArTranslateBlock[] = (result.blocks ?? [])
      .map((b) => ({
        text: (b.text ?? "").trim(),
        translation: (b.translation ?? "").trim(),
        box: cleanBox(b.box),
      }))
      .filter((b) => b.text && b.translation)

    return {
      sourceLang: (result.sourceLang ?? "mixed").toLowerCase(),
      targetLang: lang.code,
      blocks,
    }
  } catch {
    return null
  }
}

/** True when a language code is one we support. */
export function isSupportedLang(code: string): boolean {
  return AR_LANGUAGE_CODES.includes(code)
}

/**
 * Default target language for a signed-in resident, derived from their imported
 * nationality (e.g. CHINA → zh). Null when they read Malay/English or we have
 * no record — the picker then starts on the first language.
 */
export async function getSuggestedLang(userId: string): Promise<string | null> {
  const record = await prisma.eligibleStudent.findFirst({
    where: { userId, deletedAt: null },
    select: { nationality: true },
    orderBy: { createdAt: "desc" },
  })
  return nationalityToLang(record?.nationality)
}

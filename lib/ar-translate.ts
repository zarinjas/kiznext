import { prisma } from "@/lib/db"
import {
  getAiConfig,
  getArLensConfig,
  GROQ_BASE_URL,
  DEEPSEEK_BASE_URL,
  type ArLensConfig,
} from "@/lib/ai/config"
import { AiError, generateJson, generateJsonFrom, type OpenAiTarget } from "@/lib/ai/provider"
import { ocrViaGoogleVision } from "@/lib/ai/google-vision"
import { ocrViaOcrSpace } from "@/lib/ai/ocrspace"
import {
  AR_TRANSLATE_SYSTEM,
  buildArTranslatePrompt,
  AR_TRANSLATE_RESPONSE_SCHEMA,
  AR_OCR_SYSTEM,
  buildArOcrPrompt,
  AR_OCR_RESPONSE_SCHEMA,
  AR_BATCH_TRANSLATE_SYSTEM,
  buildArBatchTranslatePrompt,
  AR_BATCH_TRANSLATE_RESPONSE_SCHEMA,
} from "@/lib/ai/prompts"
import { AR_LANGUAGE_CODES, findArLanguage, nationalityToLang } from "@/lib/ar-translate-meta"

/**
 * KIZ Lens — AR live translation. Reads all text in a camera frame and
 * translates it into the resident's chosen language, returning a bounding box
 * per block so the client can overlay the translation in place.
 *
 * Two paths, same output shape either way:
 *  1. Fast path — OCR and translation as two separate jobs, each with its own
 *     provider chain, instead of one model reading, understanding AND
 *     translating an image in a single call:
 *       OCR:       OCR.space (dedicated text detection, free forever, no
 *                  card) → Groq's vision model as a backup → Google Vision
 *                  as a last resort (needs GCP billing enabled).
 *       Translate: DeepSeek → Groq's text model → OpenRouter (the same
 *                  OpenRouter key/model already configured for the main
 *                  chat provider). Plain extracted text, no image at all,
 *                  so this step is cheap on any provider regardless of
 *                  which one did the OCR.
 *     Any provider can be left unconfigured — an unset API key just skips
 *     that step of its chain.
 *  2. Combined path — the original one-call design, against whatever the
 *     admin's main chat provider is (Gemini by default). Used only when
 *     every step of both chains above is unavailable, so this keeps working
 *     unchanged for anyone who hasn't touched the new settings.
 *
 * No new dependency: everything rides plain `fetch` (Google Vision's and
 * OCR.space's REST APIs with an API key, same pattern as calling Gemini with
 * `?key=`, or the shared OpenAI-compatible provider for Groq/DeepSeek/
 * OpenRouter). Returns `null` when nothing is configured or every attempt
 * fails, so callers can show a friendly retry.
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

interface OcrRawBlock {
  text?: string
  box?: { x?: number; y?: number; w?: number; h?: number }
}
interface OcrJson {
  sourceLang?: string
  blocks?: OcrRawBlock[]
}
interface BatchTranslateJson {
  translations?: string[]
}

/** Stage 1 of the fast path: find and transcribe text, no translation. */
async function ocrExtract(
  image: string,
  mimeType: string,
  target: OpenAiTarget
): Promise<{ sourceLang: string; blocks: { text: string; box: ArTranslateBox | null }[] } | null> {
  const result = await generateJsonFrom<OcrJson>(target, {
    system: AR_OCR_SYSTEM,
    prompt: buildArOcrPrompt(),
    image: { mimeType, data: image },
    responseSchema: AR_OCR_RESPONSE_SCHEMA,
    temperature: 0,
    maxOutputTokens: 2048,
    timeoutMs: 20_000,
  })
  const blocks = (result.blocks ?? [])
    .map((b) => ({ text: (b.text ?? "").trim(), box: cleanBox(b.box) }))
    .filter((b) => b.text)
  if (blocks.length === 0) return null
  return { sourceLang: (result.sourceLang ?? "mixed").toLowerCase(), blocks }
}

/** Stage 2 of the fast path: translate already-extracted text, no image at all. */
async function translateBatch(texts: string[], targetLabel: string, targetCode: string, target: OpenAiTarget): Promise<string[] | null> {
  const result = await generateJsonFrom<BatchTranslateJson>(target, {
    system: AR_BATCH_TRANSLATE_SYSTEM,
    prompt: buildArBatchTranslatePrompt(texts, targetLabel, targetCode),
    responseSchema: AR_BATCH_TRANSLATE_RESPONSE_SCHEMA,
    temperature: 0,
    maxOutputTokens: 1024,
    timeoutMs: 12_000,
  })
  if (!Array.isArray(result.translations) || result.translations.length !== texts.length) return null
  return result.translations.map((t) => (t ?? "").trim())
}

interface OcrOutcome {
  sourceLang: string
  blocks: { text: string; box: ArTranslateBox | null }[]
}

/**
 * OCR chain, cheapest/fastest first:
 *  1. OCR.space — dedicated OCR engine, free forever (25,000/month, no card).
 *  2. Groq's vision model — backup if OCR.space isn't configured or fails.
 *     Runs on Groq's own LPU hardware rather than GPUs, so it stays fast and
 *     consistent even under load, with no finite credit balance to run out.
 *  3. Google Vision last — ~869ms typical when it works, but requires a
 *     billing account on the GCP project, so it's kept only as a fallback
 *     for whoever has that configured rather than the default path.
 * Null if none succeed.
 */
async function ocrViaChain(image: string, mimeType: string, arLens: ArLensConfig): Promise<OcrOutcome | null> {
  if (arLens.ocrSpaceApiKey) {
    try {
      const blocks = await ocrViaOcrSpace(arLens.ocrSpaceApiKey, image)
      if (blocks && blocks.length > 0) return { sourceLang: "auto", blocks }
    } catch (err) {
      console.error("[ar-translate] OCR (OCR.space) failed", err)
    }
  }

  if (arLens.groqApiKey) {
    try {
      // The default vision model emits a visible "thinking" preamble unless
      // told not to — left on, it burns the token budget on reasoning and
      // breaks the JSON parse below (same class of issue as DeepSeek's).
      const target: OpenAiTarget = {
        baseUrl: GROQ_BASE_URL,
        apiKey: arLens.groqApiKey,
        model: arLens.groqVisionModel,
        label: "Groq",
        extraBody: { reasoning_effort: "none" },
      }
      const ocr = await ocrExtract(image, mimeType, target)
      if (ocr) return ocr
    } catch (err) {
      console.error("[ar-translate] OCR (Groq) failed", err)
    }
  }

  if (arLens.googleVisionApiKey) {
    try {
      const blocks = await ocrViaGoogleVision(arLens.googleVisionApiKey, image)
      if (blocks && blocks.length > 0) return { sourceLang: "auto", blocks }
    } catch (err) {
      console.error("[ar-translate] OCR (Google Vision) failed", err)
    }
  }
  return null
}

/**
 * Translate chain: DeepSeek first (cheap, fast text model — plain extracted
 * text, no image, so a heavyweight model buys nothing here), then Groq's
 * text model, then OpenRouter as a last resort, reusing the same key/model
 * already configured for the main chat provider above rather than a
 * separate field.
 */
async function translateViaChain(
  texts: string[],
  lang: { english: string; code: string },
  arLens: ArLensConfig,
  openrouter: { apiKey: string | null; baseUrl: string; model: string }
): Promise<string[] | null> {
  const targets: OpenAiTarget[] = []
  if (arLens.deepseekApiKey) {
    // DeepSeek V4 defaults to "thinking" mode — it burns the token budget on
    // hidden reasoning before writing the answer, which is pure overhead for
    // a short batch translation and can leave the actual JSON truncated.
    targets.push({
      baseUrl: DEEPSEEK_BASE_URL,
      apiKey: arLens.deepseekApiKey,
      model: arLens.deepseekModel,
      label: "DeepSeek",
      extraBody: { thinking: { type: "disabled" } },
    })
  }
  if (arLens.groqApiKey) {
    // gpt-oss ships as a reasoning model — `reasoning_effort` is mandatory
    // (no "none"), so "low" plus hiding the reasoning from `content` keeps
    // this fast and stops the hidden preamble from polluting the JSON.
    targets.push({
      baseUrl: GROQ_BASE_URL,
      apiKey: arLens.groqApiKey,
      model: arLens.groqTranslateModel,
      label: "Groq",
      extraBody: { reasoning_effort: "low", reasoning_format: "hidden" },
    })
  }
  if (openrouter.apiKey) {
    targets.push({ baseUrl: openrouter.baseUrl, apiKey: openrouter.apiKey, model: openrouter.model, label: "OpenRouter" })
  }
  for (const target of targets) {
    try {
      const translations = await translateBatch(texts, lang.english, lang.code, target)
      if (translations) return translations
    } catch (err) {
      console.error(`[ar-translate] translate (${target.label}) failed`, err)
    }
  }
  return null
}

async function translateImageFast(
  image: string,
  mimeType: string,
  lang: { english: string; code: string }
): Promise<ArTranslateResult | null> {
  const [arLens, cfg] = await Promise.all([getArLensConfig(), getAiConfig()])

  const ocr = await ocrViaChain(image, mimeType, arLens)
  if (!ocr || ocr.blocks.length === 0) return null

  const translations = await translateViaChain(
    ocr.blocks.map((b) => b.text),
    lang,
    arLens,
    { apiKey: cfg.openrouterApiKey, baseUrl: cfg.openrouterBaseUrl, model: cfg.openrouterModel }
  )
  if (!translations) return null

  const blocks: ArTranslateBlock[] = ocr.blocks
    .map((b, i) => ({ text: b.text, translation: translations[i] ?? "", box: b.box }))
    .filter((b) => b.translation)
  if (blocks.length === 0) return null

  return { sourceLang: ocr.sourceLang, targetLang: lang.code, blocks }
}

/** Original design: one combined vision call against the admin's main provider. */
async function translateImageCombined(image: string, mimeType: string, lang: { english: string; code: string }): Promise<ArTranslateResult | null> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) return null

  const ask = (maxOutputTokens: number) =>
    generateJson<ArTranslateJson>(cfg, {
      system: AR_TRANSLATE_SYSTEM,
      prompt: buildArTranslatePrompt(lang.english, lang.code),
      image: { mimeType, data: image },
      responseSchema: AR_TRANSLATE_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens,
    })

  try {
    // A dense form/sign can blow past a small budget and truncate the JSON.
    // Start lean (fast for the common case), then retry once with more room.
    let result: ArTranslateJson
    try {
      result = await ask(4096)
    } catch (err) {
      if (err instanceof AiError && /token limit|truncat/i.test(err.message)) {
        result = await ask(8192)
      } else {
        throw err
      }
    }

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
  } catch (err) {
    // Surface the real reason (timeout, bad model, blocked, malformed JSON) in
    // the server log — the UI keeps the friendly generic message.
    console.error("[ar-translate] combined path failed", err)
    return null
  }
}

/**
 * Whether KIZ Lens has enough configured to do anything at all — either the
 * fast path (an OCR key + a translate key) or the main chat provider for the
 * combined-call fallback. Used to gate the entry points before they bother
 * capturing/sending an image.
 */
export async function isArLensUsable(): Promise<boolean> {
  const [arLens, cfg] = await Promise.all([getArLensConfig(), getAiConfig()])
  const ocrReady = Boolean(arLens.ocrSpaceApiKey || arLens.groqApiKey || arLens.googleVisionApiKey)
  const translateReady = Boolean(arLens.deepseekApiKey || arLens.groqApiKey || cfg.openrouterApiKey)
  return (ocrReady && translateReady) || cfg.enabled
}

export async function translateImage(input: TranslateImageInput): Promise<ArTranslateResult | null> {
  const image = (input.imageBase64 ?? "").trim()
  if (!image) return null

  const lang = findArLanguage(input.targetLang)
  if (!lang) return null

  const mimeType = input.mimeType || "image/jpeg"

  const fast = await translateImageFast(image, mimeType, lang)
  if (fast) return fast

  return translateImageCombined(image, mimeType, lang)
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

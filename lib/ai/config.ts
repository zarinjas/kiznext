import { prisma } from "@/lib/db"

/**
 * KIZ-AI configuration. Chat and embeddings can each run on a different
 * provider (Gemini API, or a local Ollama server). Settings live in
 * `app_settings` (settable from App Settings → AI) with env fallbacks. The
 * raw Gemini key is never sent to the browser.
 */

export type ChatProvider = "gemini" | "ollama" | "openrouter"
export type EmbedProvider = "gemini" | "ollama" | "none"
export type RetrievalMode = "auto" | "embeddings" | "keyword"

export const DEFAULT_AI_MODEL = "gemini-3.6-flash"
export const DEFAULT_GEMINI_EMBED_MODEL = "gemini-embedding-001"

/** OpenRouter — an OpenAI-compatible gateway with free vision models. */
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
export const DEFAULT_OPENROUTER_MODEL = "qwen/qwen2.5-vl-72b-instruct:free"

/** Gemini chat models retired by Google — saved values auto-upgrade to the default. */
const RETIRED_CHAT_MODELS = new Set(["gemini-2.0-flash", "gemini-2.0-flash-lite"])
export const DEFAULT_OLLAMA_URL = "http://localhost:11434"
export const DEFAULT_OLLAMA_MODEL = "llama3.2"
export const DEFAULT_OLLAMA_EMBED_MODEL = "nomic-embed-text"
export const DEFAULT_CONCIERGE_NAME = "KIZ-AI"

export const AI_SETTING_KEYS = {
  apiKey: "ai_api_key",
  model: "ai_model",
  embedModel: "ai_embed_model",
  avatar: "concierge_avatar_url",
  name: "concierge_name",
  frames: "concierge_frames",
  chatProvider: "ai_chat_provider",
  embedProvider: "ai_embed_provider",
  retrievalMode: "ai_retrieval_mode",
  ollamaUrl: "ai_ollama_url",
  ollamaModel: "ai_ollama_model",
  ollamaEmbedModel: "ai_ollama_embed_model",
  openrouterApiKey: "ai_openrouter_api_key",
  openrouterBaseUrl: "ai_openrouter_base_url",
  openrouterModel: "ai_openrouter_model",
} as const

// ── KIZ Lens fast path (OCR.space / Google Vision / Groq / DeepSeek) ────────
// Independent of the main `chatProvider` above. KIZ Lens splits each scan
// into two separate jobs, each with its own provider chain:
//   OCR (read text + boxes off the image): OCR.space, then Groq's vision
//     model as a backup, then Google Vision as a last resort.
//   Translate (plain extracted text → target language, no image at all):
//     DeepSeek, then Groq's text model, then OpenRouter (the same
//     OpenRouter key/model configured above for the main chat provider —
//     reused here, not a separate field).
// Groq backs up both stages with a different model for each. It runs on its
// own custom LPU hardware rather than GPUs, so it stays fast and consistent
// under load — chosen over a GPU-hosted provider (which had a one-off 22s
// spike in testing) for exactly that reason — and its free tier needs no
// card and has no finite credit balance to run out, unlike a typical GPU
// inference marketplace.
// Any provider can be left unconfigured — an unset API key just skips that
// step of its chain. If every step of both chains is unavailable, the whole
// thing falls back to the original combined single-call design against the
// main provider (see translateImageCombined in lib/ar-translate.ts).
export const AR_LENS_SETTING_KEYS = {
  ocrSpaceApiKey: "ar_lens_ocrspace_api_key",
  googleVisionApiKey: "ar_lens_google_vision_api_key",
  groqApiKey: "ar_lens_groq_api_key",
  groqVisionModel: "ar_lens_groq_vision_model",
  groqTranslateModel: "ar_lens_groq_translate_model",
  deepseekApiKey: "ar_lens_deepseek_api_key",
  deepseekModel: "ar_lens_deepseek_model",
} as const

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1"
// OCR backup — the only vision-capable model currently on Groq. Ships with
// tunable reasoning that must be turned off per-request (see the
// `reasoning_effort` in lib/ar-translate.ts) or it burns the token budget on
// hidden reasoning before the real answer, same class of issue as DeepSeek.
export const DEFAULT_GROQ_VISION_MODEL = "qwen/qwen3.8-27b"
// Translate backup: just rephrasing a handful of already-extracted lines —
// a small model is plenty. Ships as a reasoning model with a mandatory
// `reasoning_effort` (see lib/ar-translate.ts) — "low" keeps the hidden
// reasoning brief instead of burning the token budget before the answer.
export const DEFAULT_GROQ_TRANSLATE_MODEL = "openai/gpt-oss-20b"

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
// Translation of already-extracted plain text is a much lighter task than
// reading the image — the cheap/fast Flash tier is plenty for this step.
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-flash"

export interface ArLensConfig {
  ocrSpaceApiKey: string | null
  googleVisionApiKey: string | null
  groqApiKey: string | null
  groqVisionModel: string
  groqTranslateModel: string
  deepseekApiKey: string | null
  deepseekModel: string
}

export async function getArLensConfig(): Promise<ArLensConfig> {
  const [
    ocrSpaceApiKeyRaw,
    googleVisionApiKeyRaw,
    groqApiKeyRaw,
    groqVisionModelRaw,
    groqTranslateModelRaw,
    deepseekApiKeyRaw,
    deepseekModelRaw,
  ] = await Promise.all([
    readSetting(AR_LENS_SETTING_KEYS.ocrSpaceApiKey),
    readSetting(AR_LENS_SETTING_KEYS.googleVisionApiKey),
    readSetting(AR_LENS_SETTING_KEYS.groqApiKey),
    readSetting(AR_LENS_SETTING_KEYS.groqVisionModel),
    readSetting(AR_LENS_SETTING_KEYS.groqTranslateModel),
    readSetting(AR_LENS_SETTING_KEYS.deepseekApiKey),
    readSetting(AR_LENS_SETTING_KEYS.deepseekModel),
  ])

  return {
    ocrSpaceApiKey: ocrSpaceApiKeyRaw?.trim() || null,
    googleVisionApiKey: googleVisionApiKeyRaw?.trim() || null,
    groqApiKey: groqApiKeyRaw?.trim() || null,
    groqVisionModel: groqVisionModelRaw?.trim() || DEFAULT_GROQ_VISION_MODEL,
    groqTranslateModel: groqTranslateModelRaw?.trim() || DEFAULT_GROQ_TRANSLATE_MODEL,
    deepseekApiKey: deepseekApiKeyRaw?.trim() || null,
    deepseekModel: deepseekModelRaw?.trim() || DEFAULT_DEEPSEEK_MODEL,
  }
}

export type ConciergeEmotion = "idle" | "thinking" | "happy"

/** Up to 3 uploaded frames per emotion, played as a crossfade loop. */
export interface ConciergeFrames {
  idle: string[]
  thinking: string[]
  happy: string[]
}

export const EMPTY_FRAMES: ConciergeFrames = { idle: [], thinking: [], happy: [] }

function cleanFrames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  // Preserve slot positions — an empty string marks a slot with no upload.
  return value.slice(0, 3).map((v) => (typeof v === "string" ? v : ""))
}

/** Parse the stored JSON frame map, tolerating missing/garbage values. */
export function parseConciergeFrames(raw: string | null): ConciergeFrames {
  if (!raw) return { idle: [], thinking: [], happy: [] }
  try {
    const parsed = JSON.parse(raw) as Partial<ConciergeFrames>
    return {
      idle: cleanFrames(parsed.idle),
      thinking: cleanFrames(parsed.thinking),
      happy: cleanFrames(parsed.happy),
    }
  } catch {
    return { idle: [], thinking: [], happy: [] }
  }
}

async function readSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getConciergeFrames(): Promise<ConciergeFrames> {
  return parseConciergeFrames(await readSetting(AI_SETTING_KEYS.frames))
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export interface AiConfig {
  /** Gemini API key (null when unset). */
  apiKey: string | null
  /** Gemini chat model. */
  model: string
  /** Gemini embedding model. */
  embedModel: string

  chatProvider: ChatProvider
  embedProvider: EmbedProvider
  retrievalMode: RetrievalMode

  /** Ollama server base URL (no trailing slash). */
  ollamaUrl: string
  ollamaModel: string
  ollamaEmbedModel: string

  /** OpenRouter API key (null when unset). */
  openrouterApiKey: string | null
  /** OpenRouter base URL (no trailing slash). */
  openrouterBaseUrl: string
  /** OpenRouter chat model, e.g. a free vision model. */
  openrouterModel: string

  /** Robot mascot name shown in the concierge header. */
  conciergeName: string
  /** Uploaded robot image, or null to fall back to the sparkle icon. */
  avatarUrl: string | null
  /** Uploaded emotion frame loops (idle/thinking/happy). */
  frames: ConciergeFrames

  /** True when a chat provider is usable — features hide when false. */
  enabled: boolean
  /** True when embeddings can be generated (otherwise retrieval is keyword-only). */
  embedEnabled: boolean
}

export async function getAiConfig(): Promise<AiConfig> {
  const [
    storedKey,
    model,
    embedModel,
    avatar,
    name,
    framesRaw,
    chatProviderRaw,
    embedProviderRaw,
    retrievalModeRaw,
    ollamaUrlRaw,
    ollamaModelRaw,
    ollamaEmbedModelRaw,
    openrouterKeyRaw,
    openrouterBaseUrlRaw,
    openrouterModelRaw,
  ] = await Promise.all([
    readSetting(AI_SETTING_KEYS.apiKey),
    readSetting(AI_SETTING_KEYS.model),
    readSetting(AI_SETTING_KEYS.embedModel),
    readSetting(AI_SETTING_KEYS.avatar),
    readSetting(AI_SETTING_KEYS.name),
    readSetting(AI_SETTING_KEYS.frames),
    readSetting(AI_SETTING_KEYS.chatProvider),
    readSetting(AI_SETTING_KEYS.embedProvider),
    readSetting(AI_SETTING_KEYS.retrievalMode),
    readSetting(AI_SETTING_KEYS.ollamaUrl),
    readSetting(AI_SETTING_KEYS.ollamaModel),
    readSetting(AI_SETTING_KEYS.ollamaEmbedModel),
    readSetting(AI_SETTING_KEYS.openrouterApiKey),
    readSetting(AI_SETTING_KEYS.openrouterBaseUrl),
    readSetting(AI_SETTING_KEYS.openrouterModel),
  ])

  const apiKey = storedKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null
  const chatProvider = pick(chatProviderRaw, ["gemini", "ollama", "openrouter"] as const, "gemini")
  const embedProvider = pick(embedProviderRaw, ["gemini", "ollama", "none"] as const, "gemini")
  const retrievalMode = pick(retrievalModeRaw, ["auto", "embeddings", "keyword"] as const, "auto")
  const ollamaUrl = (ollamaUrlRaw?.trim() || DEFAULT_OLLAMA_URL).replace(/\/+$/, "")
  const openrouterApiKey = openrouterKeyRaw?.trim() || process.env.OPENROUTER_API_KEY?.trim() || null
  const openrouterBaseUrl = (openrouterBaseUrlRaw?.trim() || DEFAULT_OPENROUTER_BASE_URL).replace(/\/+$/, "")
  const openrouterModel = openrouterModelRaw?.trim() || DEFAULT_OPENROUTER_MODEL

  // `text-embedding-004` was retired (404s on v1beta) — auto-upgrade any saved value.
  const storedEmbedModel = embedModel?.trim()
  const resolvedEmbedModel =
    !storedEmbedModel || storedEmbedModel === "text-embedding-004" ? DEFAULT_GEMINI_EMBED_MODEL : storedEmbedModel

  // `gemini-2.0-flash` was retired (404s on v1beta) — auto-upgrade any saved value.
  const storedModel = model?.trim()
  const resolvedModel = !storedModel || RETIRED_CHAT_MODELS.has(storedModel) ? DEFAULT_AI_MODEL : storedModel

  const enabled =
    chatProvider === "gemini"
      ? Boolean(apiKey)
      : chatProvider === "openrouter"
        ? Boolean(openrouterApiKey)
        : Boolean(ollamaUrl)
  const embedEnabled =
    embedProvider === "gemini" ? Boolean(apiKey) : embedProvider === "ollama" ? Boolean(ollamaUrl) : false

  return {
    apiKey,
    model: resolvedModel,
    embedModel: resolvedEmbedModel,
    chatProvider,
    embedProvider,
    retrievalMode,
    ollamaUrl,
    ollamaModel: ollamaModelRaw?.trim() || DEFAULT_OLLAMA_MODEL,
    ollamaEmbedModel: ollamaEmbedModelRaw?.trim() || DEFAULT_OLLAMA_EMBED_MODEL,
    openrouterApiKey,
    openrouterBaseUrl,
    openrouterModel,
    conciergeName: name?.trim() || DEFAULT_CONCIERGE_NAME,
    avatarUrl: avatar?.trim() || null,
    frames: parseConciergeFrames(framesRaw),
    enabled,
    embedEnabled,
  }
}

export async function isAiEnabled(): Promise<boolean> {
  const cfg = await getAiConfig()
  return cfg.enabled
}

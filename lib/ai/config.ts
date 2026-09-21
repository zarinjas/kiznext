import { prisma } from "@/lib/db"

/**
 * KIZ-AI configuration. Chat and embeddings can each run on a different
 * provider (Gemini API, or a local Ollama server). Settings live in
 * `app_settings` (settable from App Settings → AI) with env fallbacks. The
 * raw Gemini key is never sent to the browser.
 */

export type ChatProvider = "gemini" | "ollama"
export type EmbedProvider = "gemini" | "ollama" | "none"
export type RetrievalMode = "auto" | "embeddings" | "keyword"

export const DEFAULT_AI_MODEL = "gemini-3.6-flash"
export const DEFAULT_GEMINI_EMBED_MODEL = "gemini-embedding-001"

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
} as const

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
  ])

  const apiKey = storedKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null
  const chatProvider = pick(chatProviderRaw, ["gemini", "ollama"] as const, "gemini")
  const embedProvider = pick(embedProviderRaw, ["gemini", "ollama", "none"] as const, "gemini")
  const retrievalMode = pick(retrievalModeRaw, ["auto", "embeddings", "keyword"] as const, "auto")
  const ollamaUrl = (ollamaUrlRaw?.trim() || DEFAULT_OLLAMA_URL).replace(/\/+$/, "")

  // `text-embedding-004` was retired (404s on v1beta) — auto-upgrade any saved value.
  const storedEmbedModel = embedModel?.trim()
  const resolvedEmbedModel =
    !storedEmbedModel || storedEmbedModel === "text-embedding-004" ? DEFAULT_GEMINI_EMBED_MODEL : storedEmbedModel

  // `gemini-2.0-flash` was retired (404s on v1beta) — auto-upgrade any saved value.
  const storedModel = model?.trim()
  const resolvedModel = !storedModel || RETIRED_CHAT_MODELS.has(storedModel) ? DEFAULT_AI_MODEL : storedModel

  const enabled =
    chatProvider === "gemini" ? Boolean(apiKey) : Boolean(ollamaUrl)
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

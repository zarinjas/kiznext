import { prisma } from "@/lib/db"

/**
 * KIZ-AI configuration. The Gemini API key and model live in `app_settings`
 * (settable from App Settings → AI) with a `GEMINI_API_KEY` env fallback, the
 * same pattern as the Resend config. The raw key is never sent to the browser.
 */

export const DEFAULT_AI_MODEL = "gemini-2.0-flash"
export const DEFAULT_EMBED_MODEL = "text-embedding-004"
export const DEFAULT_CONCIERGE_NAME = "KIZ-AI"

export const AI_SETTING_KEYS = {
  apiKey: "ai_api_key",
  model: "ai_model",
  embedModel: "ai_embed_model",
  avatar: "concierge_avatar_url",
  name: "concierge_name",
  frames: "concierge_frames",
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

export async function getConciergeFrames(): Promise<ConciergeFrames> {
  return parseConciergeFrames(await readSetting(AI_SETTING_KEYS.frames))
}

export interface AiConfig {
  apiKey: string | null
  model: string
  embedModel: string
  /** Robot mascot name shown in the concierge header. */
  conciergeName: string
  /** Uploaded robot image, or null to fall back to the sparkle icon. */
  avatarUrl: string | null
  /** Uploaded emotion frame loops (idle/thinking/happy). */
  frames: ConciergeFrames
  /** True when an API key is present — features hide when false. */
  enabled: boolean
}

async function readSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

export async function getAiConfig(): Promise<AiConfig> {
  const [storedKey, model, embedModel, avatar, name, framesRaw] = await Promise.all([
    readSetting(AI_SETTING_KEYS.apiKey),
    readSetting(AI_SETTING_KEYS.model),
    readSetting(AI_SETTING_KEYS.embedModel),
    readSetting(AI_SETTING_KEYS.avatar),
    readSetting(AI_SETTING_KEYS.name),
    readSetting(AI_SETTING_KEYS.frames),
  ])

  const apiKey = storedKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null

  return {
    apiKey,
    model: model?.trim() || DEFAULT_AI_MODEL,
    embedModel: embedModel?.trim() || DEFAULT_EMBED_MODEL,
    conciergeName: name?.trim() || DEFAULT_CONCIERGE_NAME,
    avatarUrl: avatar?.trim() || null,
    frames: parseConciergeFrames(framesRaw),
    enabled: Boolean(apiKey),
  }
}

export async function isAiEnabled(): Promise<boolean> {
  const cfg = await getAiConfig()
  return cfg.enabled
}

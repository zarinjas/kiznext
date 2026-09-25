"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ADMIN_ROLES, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { saveUpload } from "@/lib/image-upload"
import {
  AI_SETTING_KEYS,
  DEFAULT_AI_MODEL,
  DEFAULT_GEMINI_EMBED_MODEL,
  DEFAULT_CONCIERGE_NAME,
  DEFAULT_OLLAMA_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_EMBED_MODEL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  getConciergeFrames,
  type ConciergeEmotion,
  type ConciergeFrames,
} from "./config"
import { indexKnowledge } from "./rag"
import { generateJson, generateText } from "./provider"
import { embedText } from "./embed"
import { getAiConfig } from "./config"
import type { UnansweredRow, AiTestResult, OpenrouterModel } from "./types"

const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const FRAME_MAX_SIZE = 2 * 1024 * 1024
const FRAME_DIMENSION = 256

function isAiAdmin(session: { user?: { role?: string } | null } | null): boolean {
  return ADMIN_ROLES.includes(session?.user?.role as Role)
}

async function requireAiAdmin(): Promise<Role> {
  const session = await auth()
  if (!isAiAdmin(session)) throw new Error("Unauthorized")
  return session!.user!.role as Role
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

/** Masked AI config for the App Settings panel — the key is never returned. */
export async function getAiAdminConfig() {
  await requireAiAdmin()
  const cfg = await getAiConfig()
  const [keyRow, orKeyRow, knowledge, withEmbedding] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.apiKey } }),
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.openrouterApiKey } }),
    prisma.aiKnowledge.count({ where: { deletedAt: null } }),
    prisma.aiKnowledge.count({ where: { deletedAt: null, NOT: { embedding: "" } } }),
  ])
  const envKey = process.env.GEMINI_API_KEY?.trim() || null
  const storedKey = keyRow?.value?.trim() || null
  const envOrKey = process.env.OPENROUTER_API_KEY?.trim() || null
  const storedOrKey = orKeyRow?.value?.trim() || null
  return {
    apiKeySet: Boolean(storedKey || envKey),
    apiKeyFromEnv: !storedKey && Boolean(envKey),
    model: cfg.model,
    embedModel: cfg.embedModel,
    chatProvider: cfg.chatProvider,
    embedProvider: cfg.embedProvider,
    retrievalMode: cfg.retrievalMode,
    ollamaUrl: cfg.ollamaUrl,
    ollamaModel: cfg.ollamaModel,
    ollamaEmbedModel: cfg.ollamaEmbedModel,
    openrouterApiKeySet: Boolean(storedOrKey || envOrKey),
    openrouterApiKeyFromEnv: !storedOrKey && Boolean(envOrKey),
    openrouterBaseUrl: cfg.openrouterBaseUrl,
    openrouterModel: cfg.openrouterModel,
    conciergeName: cfg.conciergeName,
    avatarUrl: cfg.avatarUrl,
    frames: await getConciergeFrames(),
    knowledgeCount: knowledge,
    embeddedCount: withEmbedding,
    enabled: cfg.enabled,
  }
}

interface AiConfigInput {
  apiKey: string
  model: string
  embedModel: string
  conciergeName: string
  removeKey: boolean
  chatProvider: string
  embedProvider: string
  retrievalMode: string
  ollamaUrl: string
  ollamaModel: string
  ollamaEmbedModel: string
  openrouterApiKey: string
  removeOpenrouterKey: boolean
  openrouterBaseUrl: string
  openrouterModel: string
}

export async function saveAiConfig(input: AiConfigInput): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAiAdmin()

    if (input.removeKey) {
      await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEYS.apiKey } })
    } else if (input.apiKey.trim()) {
      await upsertSetting(AI_SETTING_KEYS.apiKey, input.apiKey.trim())
    }

    if (input.removeOpenrouterKey) {
      await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEYS.openrouterApiKey } })
    } else if (input.openrouterApiKey.trim()) {
      await upsertSetting(AI_SETTING_KEYS.openrouterApiKey, input.openrouterApiKey.trim())
    }

    await upsertSetting(AI_SETTING_KEYS.model, input.model.trim() || DEFAULT_AI_MODEL)
    await upsertSetting(AI_SETTING_KEYS.embedModel, input.embedModel.trim() || DEFAULT_GEMINI_EMBED_MODEL)
    await upsertSetting(AI_SETTING_KEYS.name, input.conciergeName.trim() || DEFAULT_CONCIERGE_NAME)
    await upsertSetting(
      AI_SETTING_KEYS.chatProvider,
      input.chatProvider === "ollama" ? "ollama" : input.chatProvider === "openrouter" ? "openrouter" : "gemini"
    )
    await upsertSetting(
      AI_SETTING_KEYS.embedProvider,
      input.embedProvider === "ollama" ? "ollama" : input.embedProvider === "none" ? "none" : "gemini",
    )
    await upsertSetting(
      AI_SETTING_KEYS.retrievalMode,
      input.retrievalMode === "keyword" ? "keyword" : input.retrievalMode === "embeddings" ? "embeddings" : "auto",
    )
    await upsertSetting(AI_SETTING_KEYS.ollamaUrl, input.ollamaUrl.trim() || DEFAULT_OLLAMA_URL)
    await upsertSetting(AI_SETTING_KEYS.ollamaModel, input.ollamaModel.trim() || DEFAULT_OLLAMA_MODEL)
    await upsertSetting(AI_SETTING_KEYS.ollamaEmbedModel, input.ollamaEmbedModel.trim() || DEFAULT_OLLAMA_EMBED_MODEL)
    await upsertSetting(
      AI_SETTING_KEYS.openrouterBaseUrl,
      input.openrouterBaseUrl.trim() || DEFAULT_OPENROUTER_BASE_URL
    )
    await upsertSetting(
      AI_SETTING_KEYS.openrouterModel,
      input.openrouterModel.trim() || DEFAULT_OPENROUTER_MODEL
    )

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error("[ai:saveAiConfig]", err)
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." }
  }
}

/** A tiny white PNG with the text "OK", used to probe a vision model. */
async function visionTestImage(): Promise<string> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="96"><rect width="240" height="96" fill="white"/><text x="120" y="62" font-family="sans-serif" font-size="44" text-anchor="middle" fill="black">OK</text></svg>`
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return png.toString("base64")
}

/**
 * Probe the configured provider: plain chat, JSON mode, vision, and embeddings.
 * Each check reports its own error so an admin can see exactly which capability
 * a model is missing (e.g. a text-only model fails only the vision check).
 */
export async function testAiConnection(): Promise<AiTestResult> {
  await requireAiAdmin()
  const cfg = await getAiConfig()

  const chat = await (async () => {
    try {
      const text = await generateText(cfg, { prompt: "Reply with the single word: OK", maxOutputTokens: 256, temperature: 0 })
      return { ok: true, detail: `${cfg.chatProvider} · "${text.slice(0, 40)}"` }
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "failed" }
    }
  })()

  const json = await (async () => {
    try {
      const parsed = await generateJson<{ word?: string }>(cfg, {
        prompt: 'Reply with JSON only: { "word": "OK" }',
        temperature: 0,
        maxOutputTokens: 256,
      })
      return { ok: true, detail: `parsed word = "${parsed.word ?? ""}"` }
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "failed" }
    }
  })()

  const vision = await (async () => {
    try {
      const image = await visionTestImage()
      const text = await generateText(cfg, {
        prompt: "Read the text in this image and reply with only that word.",
        image: { mimeType: "image/png", data: image },
        temperature: 0,
        maxOutputTokens: 64,
      })
      return { ok: true, detail: `${cfg.chatProvider} · "${text.slice(0, 40)}"` }
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "failed" }
    }
  })()

  const embed = await (async () => {
    if (!cfg.embedEnabled) return { ok: false, detail: "embeddings disabled" }
    try {
      const vector = await embedText(cfg, "KIZ test")
      return { ok: true, detail: `${cfg.embedProvider} · ${vector.length} dims` }
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "failed" }
    }
  })()

  return { chat, json, vision, embed }
}

/**
 * List the free models available on the configured OpenRouter account, so an
 * admin can pick a working (and vision-capable) model without guessing.
 */
export async function listOpenrouterModels(): Promise<{
  success: boolean
  models?: OpenrouterModel[]
  error?: string
}> {
  try {
    await requireAiAdmin()
    const cfg = await getAiConfig()
    const base = (cfg.openrouterBaseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/+$/, "")

    const headers: Record<string, string> = {}
    if (cfg.openrouterApiKey) headers.Authorization = `Bearer ${cfg.openrouterApiKey}`

    const res = await fetch(`${base}/models`, { headers, cache: "no-store" })
    if (!res.ok) {
      const raw = await res.text().catch(() => "")
      return { success: false, error: `OpenRouter returned ${res.status}: ${raw.slice(0, 200)}` }
    }

    const body = (await res.json()) as { data?: Record<string, unknown>[] }
    const models: OpenrouterModel[] = (body.data ?? [])
      .filter((m) => {
        const pricing = m.pricing as { prompt?: string; completion?: string } | undefined
        return pricing?.prompt === "0" && pricing?.completion === "0"
      })
      .map((m) => {
        const arch = m.architecture as { input_modalities?: string[] } | undefined
        const supported = Array.isArray(m.supported_parameters) ? (m.supported_parameters as string[]) : []
        return {
          id: String(m.id ?? ""),
          name: String(m.name ?? m.id ?? ""),
          context: Number(m.context_length ?? 0),
          vision: Array.isArray(arch?.input_modalities) && arch.input_modalities.includes("image"),
          structured: supported.includes("structured_outputs"),
        }
      })
      .filter((m) => m.id)
      .sort((a, b) => Number(b.vision) - Number(a.vision) || a.name.localeCompare(b.name))

    return { success: true, models }
  } catch (err) {
    console.error("[ai:listOpenrouterModels]", err)
    return { success: false, error: err instanceof Error ? err.message : "Failed to list models" }
  }
}

export async function uploadConciergeAvatar(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    await requireAiAdmin()

    const file = formData.get("avatar") as File | null
    if (!file || file.size === 0) return { success: false, error: "No image selected" }

    const existing = await prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.avatar } })
    if (existing?.value) {
      try {
        await unlink(path.join(process.cwd(), "public", existing.value))
      } catch {}
    }

    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      prefix: "concierge-robot",
      maxBytes: AVATAR_MAX_SIZE,
    })

    await upsertSetting(AI_SETTING_KEYS.avatar, result.url)
    revalidatePath("/", "layout")
    return { success: true, url: result.url }
  } catch (err) {
    console.error("[ai:uploadConciergeAvatar]", err)
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
  }
}

export async function removeConciergeAvatar(): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAiAdmin()
    const existing = await prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.avatar } })
    if (existing?.value) {
      try {
        await unlink(path.join(process.cwd(), "public", existing.value))
      } catch {}
    }
    await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEYS.avatar } })
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error("[ai:removeConciergeAvatar]", err)
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." }
  }
}

// ── Emotion frames (idle / thinking / happy, up to 3 each) ───────────────────

const EMOTIONS: ConciergeEmotion[] = ["idle", "thinking", "happy"]

function cloneFrames(frames: ConciergeFrames): ConciergeFrames {
  return { idle: [...frames.idle], thinking: [...frames.thinking], happy: [...frames.happy] }
}

async function writeFrames(frames: ConciergeFrames) {
  await upsertSetting(AI_SETTING_KEYS.frames, JSON.stringify(frames))
}

async function deleteFile(url: string | undefined) {
  if (!url) return
  try {
    await unlink(path.join(process.cwd(), "public", url))
  } catch {}
}

/**
 * Upload one emotion frame. The image is downscaled to 256×256 (contained,
 * alpha preserved) so a full set of nine frames stays light in the shell.
 */
export async function uploadConciergeFrame(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    await requireAiAdmin()

    const emotion = formData.get("emotion") as string
    const frame = Number(formData.get("frame"))
    const file = formData.get("file") as File | null

    if (!EMOTIONS.includes(emotion as ConciergeEmotion)) return { success: false, error: "Invalid emotion" }
    if (!Number.isInteger(frame) || frame < 0 || frame > 2) return { success: false, error: "Invalid frame" }
    if (!file || file.size === 0) return { success: false, error: "No image selected" }
    if (file.size > FRAME_MAX_SIZE) return { success: false, error: "Image is too large — the limit is 2MB." }

    const input = Buffer.from(await file.arrayBuffer())
    let processed: Buffer
    try {
      processed = await sharp(input, { failOn: "error", limitInputPixels: 60_000_000 })
        .rotate()
        .resize(FRAME_DIMENSION, FRAME_DIMENSION, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer()
    } catch {
      return { success: false, error: "That file isn't a readable image." }
    }

    const result = await saveUpload(processed, {
      prefix: `concierge-${emotion}`,
      maxBytes: FRAME_MAX_SIZE,
    })

    const frames = await getConciergeFrames()
    const prev = frames[emotion as ConciergeEmotion][frame]
    const next = cloneFrames(frames)
    next[emotion as ConciergeEmotion][frame] = result.url

    await writeFrames(next)
    await deleteFile(prev)

    revalidatePath("/", "layout")
    return { success: true, url: result.url }
  } catch (err) {
    console.error("[ai:uploadConciergeFrame]", err)
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
  }
}

export async function removeConciergeFrame(
  emotion: ConciergeEmotion,
  frame: number
): Promise<{ success: boolean }> {
  try {
    await requireAiAdmin()
    if (!EMOTIONS.includes(emotion) || !Number.isInteger(frame) || frame < 0 || frame > 2) {
      return { success: false }
    }
    const frames = await getConciergeFrames()
    const prev = frames[emotion][frame]
    const next = cloneFrames(frames)
    next[emotion][frame] = ""
    await writeFrames(next)
    await deleteFile(prev)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error("[ai:removeConciergeFrame]", err)
    return { success: false }
  }
}

export async function reindexKnowledgeAction(): Promise<{
  success: boolean
  error?: string
  indexed?: number
  skipped?: number
  removed?: number
  embedded?: number
  keywordOnly?: number
  mode?: "embeddings" | "keyword"
}> {
  try {
    const role = await requireAiAdmin()
    const result = await indexKnowledge()
    revalidatePath(`/${role}/urus-tetapan`)
    return { success: true, ...result }
  } catch (err) {
    console.error("[ai:reindexKnowledge]", err)
    return { success: false, error: err instanceof Error ? err.message : "Re-index failed." }
  }
}

/** Most frequent unanswered questions, newest first. Drives the FAQ feedback loop. */
export async function getUnansweredQuestions(limit = 20): Promise<UnansweredRow[]> {
  await requireAiAdmin()
  const rows = await prisma.aiUnansweredLog.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  const map = new Map<string, UnansweredRow>()
  for (const r of rows) {
    const key = r.question.trim().toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.count++
      if (!existing.ticketId && r.ticketId) existing.ticketId = r.ticketId
    } else {
      map.set(key, { question: r.question, count: 1, lastAt: r.createdAt.toISOString(), ticketId: r.ticketId })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function clearUnanswered(): Promise<{ success: boolean }> {
  try {
    await requireAiAdmin()
    await prisma.aiUnansweredLog.updateMany({ where: { deletedAt: null }, data: { deletedAt: new Date() } })
    return { success: true }
  } catch {
    return { success: false }
  }
}

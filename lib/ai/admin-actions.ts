"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { saveUpload } from "@/lib/image-upload"
import {
  AI_SETTING_KEYS,
  DEFAULT_AI_MODEL,
  DEFAULT_EMBED_MODEL,
  DEFAULT_CONCIERGE_NAME,
  getConciergeFrames,
  type ConciergeEmotion,
  type ConciergeFrames,
} from "./config"
import { indexKnowledge } from "./rag"
import type { UnansweredRow } from "./types"

const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const FRAME_MAX_SIZE = 2 * 1024 * 1024
const FRAME_DIMENSION = 256

function isAiAdmin(session: { user?: { role?: string } | null } | null): boolean {
  return session?.user?.role === "superadmin" || session?.user?.role === "admin_kiz"
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
  const [key, model, embedModel, name, avatar] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.apiKey } }),
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.model } }),
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.embedModel } }),
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.name } }),
    prisma.appSetting.findUnique({ where: { key: AI_SETTING_KEYS.avatar } }),
  ])
  const envKey = process.env.GEMINI_API_KEY?.trim() || null
  const storedKey = key?.value?.trim() || null
  return {
    apiKeySet: Boolean(storedKey || envKey),
    apiKeyFromEnv: !storedKey && Boolean(envKey),
    model: model?.value?.trim() || DEFAULT_AI_MODEL,
    embedModel: embedModel?.value?.trim() || DEFAULT_EMBED_MODEL,
    conciergeName: name?.value?.trim() || DEFAULT_CONCIERGE_NAME,
    avatarUrl: avatar?.value || null,
    frames: await getConciergeFrames(),
    knowledgeCount: await prisma.aiKnowledge.count({ where: { deletedAt: null } }),
  }
}

export async function saveAiConfig(input: {
  apiKey: string
  model: string
  embedModel: string
  conciergeName: string
  removeKey: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAiAdmin()

    if (input.removeKey) {
      await prisma.appSetting.deleteMany({ where: { key: AI_SETTING_KEYS.apiKey } })
    } else if (input.apiKey.trim()) {
      await upsertSetting(AI_SETTING_KEYS.apiKey, input.apiKey.trim())
    }

    await upsertSetting(AI_SETTING_KEYS.model, input.model.trim() || DEFAULT_AI_MODEL)
    await upsertSetting(AI_SETTING_KEYS.embedModel, input.embedModel.trim() || DEFAULT_EMBED_MODEL)
    await upsertSetting(AI_SETTING_KEYS.name, input.conciergeName.trim() || DEFAULT_CONCIERGE_NAME)

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    console.error("[ai:saveAiConfig]", err)
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." }
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

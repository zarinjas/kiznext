import type { AiConfig } from "./config"
import { AiError } from "./provider"

/**
 * Embeddings + vector math. Vectors are stored as JSON strings in Postgres and
 * compared with cosine similarity in TypeScript — no pgvector extension needed.
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 30_000

interface EmbedResponse {
  embedding?: { values?: number[] }
  error?: { message?: string }
}

/** Embed a single piece of text. Returns a float vector. */
export async function embedText(cfg: AiConfig, text: string): Promise<number[]> {
  if (!cfg.apiKey) throw new AiError("AI is not configured")

  const url = `${API_BASE}/${encodeURIComponent(cfg.embedModel)}:embedContent?key=${encodeURIComponent(cfg.apiKey)}`
  const body = {
    model: `models/${cfg.embedModel}`,
    content: { parts: [{ text }] },
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => "")
      throw new AiError(`Embedding failed (${res.status}): ${raw.slice(0, 200)}`, res.status)
    }
    const data = (await res.json()) as EmbedResponse
    const values = data.embedding?.values
    if (!Array.isArray(values) || values.length === 0) {
      throw new AiError("Embedding returned no vector")
    }
    return values
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === "AbortError") throw new AiError("Embedding timed out")
    throw new AiError(err instanceof Error ? err.message : "Embedding failed")
  } finally {
    clearTimeout(timer)
  }
}

/** Cosine similarity in [-1, 1]. Returns 0 for mismatched/empty vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

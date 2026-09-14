import type { AiConfig } from "./config"
import { AiError } from "./provider"

/**
 * Embeddings — Gemini `embedContent` or Ollama `/v1/embeddings`. Vectors are
 * stored as JSON strings and compared with cosine similarity in TypeScript.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 30_000

interface GeminiEmbedResponse {
  embedding?: { values?: number[] }
  error?: { message?: string }
}

interface OllamaEmbedResponse {
  data?: { embedding?: number[] }[]
  embeddings?: number[][]
  error?: { message?: string }
}

export function embeddingsAvailable(cfg: AiConfig): boolean {
  return cfg.embedEnabled
}

export async function embedText(cfg: AiConfig, text: string): Promise<number[]> {
  if (cfg.embedProvider === "none") throw new AiError("Embeddings are disabled")
  if (cfg.embedProvider === "ollama") return embedOllama(cfg, text)
  return embedGemini(cfg, text)
}

async function embedGemini(cfg: AiConfig, text: string): Promise<number[]> {
  if (!cfg.apiKey) throw new AiError("Gemini API key is not set")
  const url = `${GEMINI_BASE}/${encodeURIComponent(cfg.embedModel)}:embedContent?key=${encodeURIComponent(cfg.apiKey)}`
  const body = { model: `models/${cfg.embedModel}`, content: { parts: [{ text }] } }
  const data = await postJson<GeminiEmbedResponse>(url, body, "Gemini embedding")
  const values = data.embedding?.values
  if (!Array.isArray(values) || values.length === 0) throw new AiError("Embedding returned no vector")
  return values
}

async function embedOllama(cfg: AiConfig, text: string): Promise<number[]> {
  const url = `${cfg.ollamaUrl}/v1/embeddings`
  const body = { model: cfg.ollamaEmbedModel, input: text }
  const data = await postJson<OllamaEmbedResponse>(url, body, "Ollama embedding")
  const values = data.data?.[0]?.embedding ?? data.embeddings?.[0]
  if (!Array.isArray(values) || values.length === 0) throw new AiError("Embedding returned no vector")
  return values
}

async function postJson<T>(url: string, body: unknown, label: string): Promise<T> {
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
      throw new AiError(`${label} failed (${res.status}): ${raw.slice(0, 200)}`, res.status)
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === "AbortError") throw new AiError(`${label} timed out`)
    throw new AiError(err instanceof Error ? err.message : `${label} failed`)
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

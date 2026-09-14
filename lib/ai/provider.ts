import type { AiConfig } from "./config"

/**
 * Gemini provider — plain `fetch` against the REST API, no SDK dependency.
 * https://ai.google.dev/api/generate-content
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 30_000

export class AiError extends Error {
  readonly status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "AiError"
    this.status = status
  }
}

export interface GenerateOptions {
  prompt: string
  system?: string
  temperature?: number
  maxOutputTokens?: number
  /** Ask Gemini for strict JSON output. */
  json?: boolean
  /** Optional response schema (OpenAPI subset) when `json` is true. */
  responseSchema?: unknown
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

async function callGemini(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  if (!cfg.apiKey) throw new AiError("AI is not configured")

  const url = `${API_BASE}/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 1024,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
    },
  }
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] }

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
      throw new AiError(`Gemini request failed (${res.status}): ${raw.slice(0, 300)}`, res.status)
    }

    const data = (await res.json()) as GeminiResponse
    const parts = data.candidates?.[0]?.content?.parts
    const text = Array.isArray(parts) ? parts.map((p) => p.text ?? "").join("") : ""
    if (!text.trim()) throw new AiError("Gemini returned an empty response")
    return text.trim()
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiError("Gemini request timed out")
    }
    throw new AiError(err instanceof Error ? err.message : "Gemini request failed")
  } finally {
    clearTimeout(timer)
  }
}

export async function generateText(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  return callGemini(cfg, opts)
}

/** Generate a JSON object and parse it. Throws `AiError` on invalid JSON. */
export async function generateJson<T>(cfg: AiConfig, opts: GenerateOptions): Promise<T> {
  const raw = await callGemini(cfg, { ...opts, json: true })
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new AiError("Gemini returned malformed JSON")
  }
}

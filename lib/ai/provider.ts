import type { AiConfig } from "./config"

/**
 * Chat provider layer — Gemini REST or a local Ollama server (OpenAI-compatible
 * `/v1/chat/completions`). Plain `fetch`, no SDK dependency.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
const TIMEOUT_MS = 45_000

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
  /** Ask the model for strict JSON output. */
  json?: boolean
  /** Optional Gemini response schema (OpenAPI subset) when `json` is true. */
  responseSchema?: unknown
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

interface OllamaResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

async function callGemini(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  if (!cfg.apiKey) throw new AiError("Gemini API key is not set")

  const url = `${GEMINI_BASE}/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
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

  const data = await postJson<GeminiResponse>(url, body, "Gemini")
  const parts = data.candidates?.[0]?.content?.parts
  const text = Array.isArray(parts) ? parts.map((p) => p.text ?? "").join("") : ""
  if (!text.trim()) throw new AiError("Gemini returned an empty response")
  return text.trim()
}

async function callOllama(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  const url = `${cfg.ollamaUrl}/v1/chat/completions`
  const messages: { role: string; content: string }[] = []
  if (opts.system) messages.push({ role: "system", content: opts.system })
  messages.push({ role: "user", content: opts.prompt })

  const body: Record<string, unknown> = {
    model: cfg.ollamaModel,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxOutputTokens ?? 1024,
    stream: false,
    ...(opts.json ? { response_format: { type: "json_object" } } : {}),
  }

  const data = await postJson<OllamaResponse>(url, body, "Ollama")
  const text = data.choices?.[0]?.message?.content ?? ""
  if (!text.trim()) throw new AiError("Ollama returned an empty response")
  return text.trim()
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
      throw new AiError(`${label} request failed (${res.status}): ${raw.slice(0, 300)}`, res.status)
    }
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof AiError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiError(`${label} request timed out`)
    }
    throw new AiError(err instanceof Error ? err.message : `${label} request failed`)
  } finally {
    clearTimeout(timer)
  }
}

export async function generateText(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  return cfg.chatProvider === "ollama" ? callOllama(cfg, opts) : callGemini(cfg, opts)
}

/** Generate a JSON object and parse it. Throws `AiError` on invalid JSON. */
export async function generateJson<T>(cfg: AiConfig, opts: GenerateOptions): Promise<T> {
  const raw = await generateText(cfg, { ...opts, json: true })
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new AiError("Model returned malformed JSON")
  }
}

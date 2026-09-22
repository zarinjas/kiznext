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

export interface GenerateImage {
  /** MIME type of the inline image, e.g. "image/jpeg". */
  mimeType: string
  /** Base64-encoded image bytes (no data-URL prefix). */
  data: string
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
  /** Optional inline image for vision models (OCR, describe, translate). */
  image?: GenerateImage
}

interface GeminiPart {
  text?: string
  /** Inline image bytes for vision requests. */
  inlineData?: { mimeType: string; data: string }
  /** Reasoning parts emitted by Gemini 2.5+/3 "thinking" models. */
  thought?: boolean
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

/**
 * Gemini 2.5+/3 flash models think by default, and those reasoning tokens count
 * against `maxOutputTokens` — a small budget leaves no room for the answer and
 * the reply comes back empty. Disable thinking for these models so chat and
 * strict-JSON replies stay deterministic and cheap.
 */
function wantsNoThinking(model: string): boolean {
  return /gemini-(2\.5|3)/.test(model)
}

function buildGenerationConfig(cfg: AiConfig, opts: GenerateOptions, noThinking: boolean): Record<string, unknown> {
  return {
    temperature: opts.temperature ?? 0.4,
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
    ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    ...(opts.json ? { responseMimeType: "application/json" } : {}),
    ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
  }
}

interface OllamaResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

async function callGemini(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  if (!cfg.apiKey) throw new AiError("Gemini API key is not set")

  const url = `${GEMINI_BASE}/${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
  const inputParts: GeminiPart[] = []
  if (opts.image) {
    inputParts.push({ inlineData: { mimeType: opts.image.mimeType, data: opts.image.data } })
  }
  inputParts.push({ text: opts.prompt })
  const contents = [{ role: "user", parts: inputParts }]

  const attempt = (noThinking: boolean) =>
    postJson<GeminiResponse>(
      url,
      {
        contents,
        generationConfig: buildGenerationConfig(cfg, opts, noThinking),
        ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      },
      "Gemini"
    )

  let data: GeminiResponse
  try {
    data = await attempt(wantsNoThinking(cfg.model))
  } catch (err) {
    // A model that doesn't support thinkingConfig rejects the request — retry
    // without it rather than failing the whole call.
    if (err instanceof AiError && err.status === 400 && /thinking/i.test(err.message)) {
      data = await attempt(false)
    } else {
      throw err
    }
  }

  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts
  const text = Array.isArray(parts)
    ? parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("")
    : ""
  if (!text.trim()) {
    const bits = [
      candidate?.finishReason ? `finishReason: ${candidate.finishReason}` : "",
      data.promptFeedback?.blockReason ? `blocked: ${data.promptFeedback.blockReason}` : "",
    ].filter(Boolean)
    throw new AiError(`Gemini returned an empty response${bits.length ? ` (${bits.join(", ")})` : ""}`)
  }
  return text.trim()
}

async function callOllama(cfg: AiConfig, opts: GenerateOptions): Promise<string> {
  const url = `${cfg.ollamaUrl}/v1/chat/completions`
  const messages: { role: string; content: unknown }[] = []
  if (opts.system) messages.push({ role: "system", content: opts.system })
  // Vision-capable Ollama models accept the OpenAI content-parts form. Plain
  // text models get a bare string so nothing changes for the text-only path.
  const userContent = opts.image
    ? [
        { type: "image_url", image_url: { url: `data:${opts.image.mimeType};base64,${opts.image.data}` } },
        { type: "text", text: opts.prompt },
      ]
    : opts.prompt
  messages.push({ role: "user", content: userContent })

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

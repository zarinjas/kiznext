export * from "./config"
export * from "./provider"
export * from "./embed"
export * from "./rag"
export * from "./prompts"
export * from "./translate"
export * from "./bm25"

import { getAiConfig } from "./config"
import { generateJson } from "./provider"
import { retrieve, type RetrievalModeUsed } from "./rag"
import { CONCIERGE_SYSTEM, buildConciergePrompt, CONCIERGE_RESPONSE_SCHEMA } from "./prompts"
import type { ConciergeKind } from "./types"

export interface ConciergeSource {
  title: string
  href: string | null
}

export interface ConciergeAnswer {
  answer: string
  kind: ConciergeKind
  confident: boolean
  sources: ConciergeSource[]
  bestScore: number
  mode: RetrievalModeUsed
}

interface ConciergeJson {
  answer: string
  used: number[]
  kind: string
}

/** Trust the model's `kind`, falling back to a safe inference if it's malformed. */
function normalizeKind(raw: string, used: number[] | undefined, grounded: boolean): ConciergeKind {
  if (raw === "chat" || raw === "kiz" || raw === "unknown") {
    // A "kiz" answer with no usable context can't really be grounded.
    if (raw === "kiz" && !grounded) return "unknown"
    return raw
  }
  return used && used.length ? "kiz" : "chat"
}

/**
 * End-to-end concierge reply: retrieve (embeddings or BM25 keyword) → generate
 * → cite. The model is always called, so the assistant can hold a normal
 * conversation; retrieved context is injected only when it's actually relevant,
 * where it becomes the authoritative source for KIZ questions.
 */
export async function answerQuestion(question: string): Promise<ConciergeAnswer> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) throw new Error("AI is not configured")

  const result = await retrieve(question, 5)
  // Only inject context that passed the relevance gate — unrelated chunks would
  // otherwise be forced into general-knowledge answers.
  const chunks = result.confident ? result.chunks : []

  const numbered = chunks.map((c, i) => ({ index: i + 1, title: c.title, content: c.content }))
  const generated = await generateJson<ConciergeJson>(cfg, {
    system: CONCIERGE_SYSTEM,
    prompt: buildConciergePrompt(question, numbered),
    responseSchema: CONCIERGE_RESPONSE_SCHEMA,
    temperature: 0.5,
    maxOutputTokens: 700,
  })

  const kind = normalizeKind(generated.kind, generated.used, chunks.length > 0)
  const used = new Set(generated.used ?? [])
  const cited = chunks
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ n }) => used.has(n))
    .map(({ c }) => ({ title: c.title, href: c.href }))

  const sources =
    kind === "kiz"
      ? cited.length
        ? cited
        : chunks.slice(0, 2).map((c) => ({ title: c.title, href: c.href }))
      : []

  return {
    answer: generated.answer?.trim() || "",
    kind,
    confident: kind !== "unknown",
    sources,
    bestScore: result.bestScore,
    mode: result.mode,
  }
}

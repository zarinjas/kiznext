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

export interface ConciergeSource {
  title: string
  href: string | null
}

export interface ConciergeAnswer {
  answer: string
  confident: boolean
  sources: ConciergeSource[]
  bestScore: number
  mode: RetrievalModeUsed
}

interface ConciergeJson {
  answer: string
  used: number[]
  confident: boolean
}

/**
 * End-to-end RAG answer: retrieve (embeddings or BM25 keyword) → generate →
 * cite. Returns `confident: false` (empty answer) when nothing relevant is
 * indexed, so the UI can offer to connect the resident to the office.
 */
export async function answerQuestion(question: string): Promise<ConciergeAnswer> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) throw new Error("AI is not configured")

  const result = await retrieve(question, 5)
  if (!result.confident || result.chunks.length === 0) {
    return { answer: "", confident: false, sources: [], bestScore: result.bestScore, mode: result.mode }
  }

  const numbered = result.chunks.map((c, i) => ({ index: i + 1, title: c.title, content: c.content }))
  const generated = await generateJson<ConciergeJson>(cfg, {
    system: CONCIERGE_SYSTEM,
    prompt: buildConciergePrompt(question, numbered),
    responseSchema: CONCIERGE_RESPONSE_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 700,
  })

  const used = new Set(generated.used ?? [])
  const cited = result.chunks
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ n }) => used.has(n))
    .map(({ c }) => ({ title: c.title, href: c.href }))

  return {
    answer: generated.answer?.trim() || "",
    confident: Boolean(generated.confident),
    sources: cited.length ? cited : result.chunks.slice(0, 2).map((c) => ({ title: c.title, href: c.href })),
    bestScore: result.bestScore,
    mode: result.mode,
  }
}

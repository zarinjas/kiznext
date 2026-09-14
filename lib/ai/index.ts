export * from "./config"
export * from "./provider"
export * from "./embed"
export * from "./rag"
export * from "./prompts"

import { getAiConfig } from "./config"
import { generateJson } from "./provider"
import { retrieve } from "./rag"
import { CONCIERGE_SYSTEM, buildConciergePrompt, CONCIERGE_RESPONSE_SCHEMA } from "./prompts"

/** Minimum cosine score before we trust the retrieval enough to answer. */
export const MIN_RELEVANCE = 0.62

export interface ConciergeSource {
  title: string
  href: string | null
}

export interface ConciergeAnswer {
  answer: string
  confident: boolean
  sources: ConciergeSource[]
  bestScore: number
}

interface ConciergeJson {
  answer: string
  used: number[]
  confident: boolean
}

/**
 * End-to-end RAG answer: retrieve → generate → cite. Returns `confident: false`
 * (with an empty answer) when nothing relevant is indexed, so the UI can offer
 * to connect the resident to the office.
 */
export async function answerQuestion(question: string): Promise<ConciergeAnswer> {
  const cfg = await getAiConfig()
  if (!cfg.enabled) throw new Error("AI is not configured")

  const chunks = await retrieve(question, 5)
  const bestScore = chunks[0]?.score ?? 0

  if (bestScore < MIN_RELEVANCE) {
    return { answer: "", confident: false, sources: [], bestScore }
  }

  const numbered = chunks.map((c, i) => ({ index: i + 1, title: c.title, content: c.content }))
  const result = await generateJson<ConciergeJson>(cfg, {
    system: CONCIERGE_SYSTEM,
    prompt: buildConciergePrompt(question, numbered),
    responseSchema: CONCIERGE_RESPONSE_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 700,
  })

  const used = new Set(result.used ?? [])
  const cited = chunks
    .map((c, i) => ({ c, n: i + 1 }))
    .filter(({ n }) => used.has(n))
    .map(({ c }) => ({ title: c.title, href: c.href }))

  return {
    answer: result.answer?.trim() || "",
    confident: Boolean(result.confident) && bestScore >= MIN_RELEVANCE,
    sources: cited.length ? cited : chunks.slice(0, 2).map((c) => ({ title: c.title, href: c.href })),
    bestScore,
  }
}

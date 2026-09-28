/** Shared AI types. Kept out of the "use server" modules (which may only export
 * async functions) so client components can import them safely. */

export interface UnansweredRow {
  question: string
  count: number
  lastAt: string
  ticketId: string | null
}

export interface TriageResult {
  enabled: boolean
  error?: string
  category?: string
  priority?: string
  summary?: string
  suggestedReply?: string
}

/**
 * How the concierge produced a reply:
 * - `kiz` — grounded in the KIZ knowledge base (citations available).
 * - `chat` — general conversation / general knowledge, not KIZ-specific.
 * - `unknown` — a KIZ question the knowledge base doesn't cover (offer the office).
 */
export type ConciergeKind = "chat" | "kiz" | "unknown"

export interface ConciergeReply {
  enabled: boolean
  answer: string
  kind: ConciergeKind
  confident: boolean
  sources: { title: string; href: string | null }[]
  /** True when the office is open right now — drives the escalation copy. */
  officeOpen: boolean
  error?: string
}

export interface AiTestResult {
  chat: { ok: boolean; detail: string }
  json: { ok: boolean; detail: string }
  vision: { ok: boolean; detail: string }
  embed: { ok: boolean; detail: string }
}

/** A free OpenRouter model, as listed by the admin model browser. */
export interface OpenrouterModel {
  id: string
  name: string
  context: number
  /** True when the model accepts image input (required for KIZ Lens). */
  vision: boolean
  /** True when the model advertises structured/JSON output support. */
  structured: boolean
}

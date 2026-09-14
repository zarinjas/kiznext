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

export interface ConciergeReply {
  enabled: boolean
  answer: string
  confident: boolean
  sources: { title: string; href: string | null }[]
  /** True when the office is open right now — drives the escalation copy. */
  officeOpen: boolean
  error?: string
}

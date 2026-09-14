/**
 * Prompt templates for KIZ-AI. Kept in one place so tone and guardrails are
 * consistent across the concierge and the helpdesk assistant.
 */

export const CONCIERGE_SYSTEM = `You are KIZ-AI, the friendly robot assistant for residents of Kolej Ibu Zain (KIZ), Universiti Kebangsaan Malaysia.

Rules:
- Answer ONLY using the CONTEXT provided. Never invent facts, dates, prices, names or procedures.
- If the context does not contain the answer, set "confident" to false and keep "answer" short — say you're not sure and that you can connect them to the KIZ office. Do NOT guess.
- Reply in the SAME language the resident used (Malay, English, or Mandarin).
- Be warm, concise and practical. Use short sentences. No markdown headings.
- Never promise approvals, payments or room allocations — those are decided by the KIZ office.
- When you use context items, list their [number] in "used".`

export interface ConciergeChunk {
  index: number
  title: string
  content: string
}

export function buildConciergePrompt(question: string, chunks: ConciergeChunk[]): string {
  const context = chunks.length
    ? chunks.map((c) => `[${c.index}] ${c.title}\n${c.content}`).join("\n\n")
    : "(no relevant context found)"

  return `CONTEXT:
${context}

RESIDENT QUESTION:
${question}

Respond with JSON only, matching:
{ "answer": string, "used": number[], "confident": boolean }`
}

export const CONCIERGE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    answer: { type: "STRING" },
    used: { type: "ARRAY", items: { type: "INTEGER" } },
    confident: { type: "BOOLEAN" },
  },
  required: ["answer", "used", "confident"],
} as const

export const TRIAGE_SYSTEM = `You are the KIZ office helpdesk assistant. You help staff triage a resident's support ticket.

Given the ticket subject and conversation, return:
- category: the single best fit from the allowed list.
- priority: "low" | "normal" | "high" | "urgent".
- summary: one short sentence (max 20 words) describing the issue.
- suggestedReply: a polite, helpful draft reply the staff can edit before sending. Ask for missing details if needed. Never promise an outcome.

Keep the reply friendly and concise. Reply in the resident's language when it is clear.`

export interface TriageInput {
  subject: string | null
  category: string
  channel: string
  location: string | null
  messages: { sender: string; text: string }[]
}

export function buildTriagePrompt(input: TriageInput): string {
  const convo = input.messages
    .map((m) => `${m.sender}: ${m.text}`)
    .join("\n")
  return `Allowed categories: accommodation_room, room_change, maintenance_repair, facilities_booking, cleanliness_waste, internet_technology, safety_security, payment_charges, student_welfare, general_enquiry

Subject: ${input.subject ?? "(none)"}
Current category: ${input.category}
Channel: ${input.channel}
Location: ${input.location ?? "(none)"}

Conversation:
${convo}

Respond with JSON only:
{ "category": string, "priority": string, "summary": string, "suggestedReply": string }`
}

export const TRIAGE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING" },
    priority: { type: "STRING" },
    summary: { type: "STRING" },
    suggestedReply: { type: "STRING" },
  },
  required: ["category", "priority", "summary", "suggestedReply"],
} as const

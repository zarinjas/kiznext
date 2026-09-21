"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getAiConfig } from "@/lib/ai/config"
import { answerQuestion } from "@/lib/ai"
import type { ConciergeReply } from "@/lib/ai/types"
import { isOfficeHours } from "@/lib/office-hours"

/** Answer a resident's question from the KIZ knowledge index. */
export async function askConcierge(question: string): Promise<ConciergeReply> {
  const session = await auth()
  const officeOpen = isOfficeHours()
  if (!session?.user?.id) {
    return { enabled: false, answer: "", kind: "unknown", confident: false, sources: [], officeOpen, error: "Unauthorized" }
  }

  const q = question.trim()
  if (q.length < 2) {
    return { enabled: true, answer: "", kind: "unknown", confident: false, sources: [], officeOpen }
  }

  const cfg = await getAiConfig()
  if (!cfg.enabled) {
    return { enabled: false, answer: "", kind: "unknown", confident: false, sources: [], officeOpen }
  }

  try {
    const result = await answerQuestion(q)

    // Only genuine "I don't know this KIZ thing" misses feed the FAQ feedback
    // loop — greetings and general chat are answered, not logged.
    if (result.kind === "unknown" || !result.answer) {
      await prisma.aiUnansweredLog.create({
        data: { userId: session.user.id, question: q.slice(0, 500), bestScore: result.bestScore },
      })
      return { enabled: true, answer: "", kind: "unknown", confident: false, sources: [], officeOpen }
    }

    return {
      enabled: true,
      answer: result.answer,
      kind: result.kind,
      confident: true,
      sources: result.sources,
      officeOpen,
    }
  } catch (err) {
    console.error("[ai:askConcierge]", err)
    return {
      enabled: true,
      answer: "",
      kind: "unknown",
      confident: false,
      sources: [],
      officeOpen,
      error: err instanceof Error ? err.message : "KIZ-AI is unavailable right now.",
    }
  }
}

export interface EscalateInput {
  question: string
  /** The robot's answer, if it gave one, included in the ticket transcript. */
  aiAnswer?: string
  channel?: "live" | "ticket"
}

/**
 * Hand a question the robot couldn't answer to the KIZ office as a helpdesk
 * request, pre-filled with the conversation so the resident never retypes it.
 */
export async function escalateToOffice(input: EscalateInput): Promise<{ ticketId: string }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const question = input.question.trim()
  if (!question) throw new Error("Nothing to send")

  const officeOpen = isOfficeHours()
  const channel = input.channel ?? (officeOpen ? "live" : "ticket")

  const transcript = [
    `Resident asked KIZ-AI: ${question}`,
    input.aiAnswer ? `KIZ-AI replied: ${input.aiAnswer}` : "KIZ-AI couldn't find an answer in the KIZ knowledge base.",
  ].join("\n\n")

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      userId: session.user.id,
      subject: question.slice(0, 120),
      category: "general_enquiry",
      channel,
      origin: "concierge",
      status: "submitted",
      messages: {
        create: { senderId: session.user.id, message: transcript },
      },
    },
  })

  // Link the unanswered log entry so the FAQ feedback loop knows it was handled.
  await prisma.aiUnansweredLog.updateMany({
    where: { userId: session.user.id, ticketId: null, question: question.slice(0, 500), deletedAt: null },
    data: { ticketId: ticket.id },
  })

  return { ticketId: ticket.id }
}

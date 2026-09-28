"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { askConciergeCore } from "@/lib/ai/concierge"
import type { ConciergeReply } from "@/lib/ai/types"
import { isOfficeHours } from "@/lib/office-hours"

/** Answer a resident's question from the KIZ knowledge index. */
export async function askConcierge(question: string): Promise<ConciergeReply> {
  const session = await auth()
  if (!session?.user?.id) {
    return {
      enabled: false,
      answer: "",
      kind: "unknown",
      confident: false,
      sources: [],
      officeOpen: isOfficeHours(),
      error: "Unauthorized",
    }
  }
  return askConciergeCore(session.user.id, question)
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

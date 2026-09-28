import { prisma } from "@/lib/db"
import { getAiConfig } from "@/lib/ai/config"
import { answerQuestion } from "@/lib/ai"
import type { ConciergeReply } from "@/lib/ai/types"
import { isOfficeHours } from "@/lib/office-hours"

/**
 * KIZ-AI concierge core — shared by the web Server Action and the mobile API
 * route. Always returns a `ConciergeReply` (never throws) so the client can
 * render a graceful "unavailable" state.
 */
export async function askConciergeCore(userId: string, question: string): Promise<ConciergeReply> {
  const officeOpen = isOfficeHours()

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
        data: { userId, question: q.slice(0, 500), bestScore: result.bestScore },
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
    console.error("[ai:askConciergeCore]", err)
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

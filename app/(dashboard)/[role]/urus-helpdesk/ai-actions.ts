"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { getAiConfig } from "@/lib/ai/config"
import { generateJson } from "@/lib/ai/provider"
import { TRIAGE_SYSTEM, buildTriagePrompt, TRIAGE_RESPONSE_SCHEMA } from "@/lib/ai/prompts"
import { helpdeskLocationLabel, HELPDESK_CATEGORIES } from "@/lib/helpdesk-meta"
import type { TriageResult } from "@/lib/ai/types"
import { revalidatePath } from "next/cache"

const VALID_CATEGORIES = new Set(HELPDESK_CATEGORIES.map((c) => c.value as string))

/** Ask Gemini to categorise, prioritise and draft a reply for a ticket. */
export async function analyzeTicket(ticketId: string): Promise<TriageResult> {
  const session = await auth()
  if (!session?.user?.id) return { enabled: false, error: "Unauthorized" }
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const cfg = await getAiConfig()
  if (!cfg.enabled) return { enabled: false }

  const ticket = await prisma.helpdeskTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { name: true, role: true } } },
      },
    },
  })
  if (!ticket || ticket.deletedAt) return { enabled: true, error: "Ticket not found" }

  const location = helpdeskLocationLabel(ticket.locationBlock, ticket.locationDetail)

  try {
    const result = await generateJson<{
      category: string
      priority: string
      summary: string
      suggestedReply: string
    }>(cfg, {
      system: TRIAGE_SYSTEM,
      prompt: buildTriagePrompt({
        subject: ticket.subject,
        category: ticket.category,
        channel: ticket.channel,
        location,
        messages: ticket.messages.map((m) => ({ sender: m.sender.name, text: m.message })),
      }),
      responseSchema: TRIAGE_RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 700,
    })

    const category = VALID_CATEGORIES.has(result.category) ? result.category : ticket.category

    return {
      enabled: true,
      category,
      priority: result.priority,
      summary: result.summary,
      suggestedReply: result.suggestedReply,
    }
  } catch (err) {
    console.error("[ai:analyzeTicket]", err)
    return { enabled: true, error: err instanceof Error ? err.message : "KIZ-AI is unavailable right now." }
  }
}

/** Apply the AI-suggested category to a ticket (admin-confirmed). */
export async function applyTicketCategory(ticketId: string, category: string): Promise<{ success: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { success: false }
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  if (!VALID_CATEGORIES.has(category)) return { success: false }

  await prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { category: category as never },
  })
  revalidatePath(`/${session.user.role}/urus-helpdesk/${ticketId}`)
  revalidatePath(`/${session.user.role}/urus-helpdesk`)
  return { success: true }
}

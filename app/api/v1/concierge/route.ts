import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, badRequest } from "@/lib/mobile-auth"
import { askConciergeCore } from "@/lib/ai/concierge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Ask KIZ-AI a question (Gemini/Ollama RAG). Returns a `ConciergeReply`. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const question = typeof body?.question === "string" ? body.question : ""
  if (!question.trim()) return badRequest("Ask a question first.")

  const reply = await askConciergeCore(auth.user.id, question)
  return NextResponse.json({ data: reply })
}

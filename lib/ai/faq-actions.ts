"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { parseCsvToObjects, toCsv } from "@/lib/csv"
import { FAQ_SEED, FAQ_CSV_HEADERS, FAQ_CATEGORIES } from "./faq-seed"

/**
 * Human-readable instructions baked into the downloaded CSV as rows whose first
 * cell starts with `#`. The importer ignores them, so staff can read the file
 * in Excel/Sheets without a separate guide.
 */
const FAQ_INSTRUCTIONS: string[] = [
  "# KIZ-AI FAQ — how to fill this file",
  "# 1. Do NOT change or delete the header row (category, question, answer, keywords, language, published).",
  "# 2. Add one question per row: put the question in 'question' and the official answer in 'answer'.",
  "# 3. 'category' — use one of the categories listed below, or type your own.",
  "# 4. 'keywords' (optional) — Malay/Chinese words that help KIZ-AI match the question.",
  "# 5. 'published' — true to go live after re-index; false to save it as a draft.",
  "# 6. Rows are matched by the 'question' text, so re-uploading this file UPDATES answers instead of duplicating them.",
  "# 7. Delete these '#' lines if you like — they are ignored on import either way.",
  "# 8. When done: save as CSV, then upload in the app at AI → FAQ Knowledge → Import CSV, then Re-index on the KIZ-AI page.",
  `# Categories: ${FAQ_CATEGORIES.join(" | ")}`,
]

function instructionRows(): Record<string, string>[] {
  return FAQ_INSTRUCTIONS.map((line) => ({
    category: line,
    question: "",
    answer: "",
    keywords: "",
    language: "",
    published: "",
  }))
}

function isInstructionRow(category: string, question: string): boolean {
  return category.trim().startsWith("#") || question.trim().startsWith("#")
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  return session.user.role as Role
}

function revalidate(role: Role) {
  revalidatePath(`/${role}/urus-faq`)
  revalidatePath(`/${role}/urus-ai`)
}

interface FaqInput {
  category: string
  question: string
  answer: string
  keywords?: string
  published: boolean
}

export async function createFaq(input: FaqInput): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireAdmin()
    const question = input.question.trim()
    if (!question) return { success: false, error: "Question is required." }
    await prisma.faq.create({
      data: {
        category: input.category.trim() || "General & Contact",
        question,
        answer: input.answer.trim(),
        keywords: input.keywords?.trim() || null,
        published: input.published,
      },
    })
    revalidate(role)
    return { success: true }
  } catch (err) {
    console.error("[faq:create]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't save." }
  }
}

export async function updateFaq(id: string, input: FaqInput): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireAdmin()
    const question = input.question.trim()
    if (!question) return { success: false, error: "Question is required." }
    await prisma.faq.update({
      where: { id },
      data: {
        category: input.category.trim() || "General & Contact",
        question,
        answer: input.answer.trim(),
        keywords: input.keywords?.trim() || null,
        published: input.published,
      },
    })
    revalidate(role)
    return { success: true }
  } catch (err) {
    console.error("[faq:update]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't save." }
  }
}

export async function deleteFaq(id: string): Promise<{ success: boolean }> {
  try {
    const role = await requireAdmin()
    await prisma.faq.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidate(role)
    return { success: true }
  } catch (err) {
    console.error("[faq:delete]", err)
    return { success: false }
  }
}

/** Insert the starter questions as unpublished drafts (skips ones that exist). */
export async function seedStarterFaqs(): Promise<{ success: boolean; added: number }> {
  try {
    const role = await requireAdmin()
    const existing = await prisma.faq.findMany({ where: { deletedAt: null }, select: { question: true } })
    const have = new Set(existing.map((f) => f.question.trim().toLowerCase()))

    const toAdd = FAQ_SEED.filter((s) => !have.has(s.question.trim().toLowerCase()))
    if (toAdd.length > 0) {
      await prisma.faq.createMany({
        data: toAdd.map((s) => ({ category: s.category, question: s.question, answer: "", published: true })),
      })
    }
    revalidate(role)
    return { success: true, added: toAdd.length }
  } catch (err) {
    console.error("[faq:seed]", err)
    return { success: false, added: 0 }
  }
}

function parseBool(v: string): boolean {
  return ["true", "1", "yes", "y", "published"].includes(v.trim().toLowerCase())
}

interface FaqImportResult {
  success: boolean
  error?: string
  added?: number
  updated?: number
  skipped?: number
}

/** Import FAQs from CSV text. Matches existing rows by question (case-insensitive). */
export async function importFaqs(csvText: string): Promise<FaqImportResult> {
  try {
    const role = await requireAdmin()
    const { headers, rows } = parseCsvToObjects(csvText)
    if (rows.length === 0) return { success: false, error: "The file has no rows." }
    if (!headers.includes("question")) {
      return { success: false, error: "Missing a 'question' column. Download the template for the right format." }
    }

    const existing = await prisma.faq.findMany({ where: { deletedAt: null } })
    const byQuestion = new Map(existing.map((f) => [f.question.trim().toLowerCase(), f]))

    let added = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      const question = (row.question ?? "").trim()
      const categoryCell = (row.category ?? "").trim()
      if (isInstructionRow(categoryCell, question)) continue
      if (!question) {
        skipped++
        continue
      }
      const data = {
        category: categoryCell || "General & Contact",
        answer: (row.answer ?? "").trim(),
        keywords: (row.keywords ?? "").trim() || null,
        language: (row.language ?? "").trim() || "en",
        published: row.published === undefined || row.published === "" ? true : parseBool(row.published),
      }
      const prev = byQuestion.get(question.toLowerCase())
      if (prev) {
        await prisma.faq.update({ where: { id: prev.id }, data: { ...data, question } })
        updated++
      } else {
        await prisma.faq.create({ data: { ...data, question } })
        added++
      }
    }

    revalidate(role)
    return { success: true, added, updated, skipped }
  } catch (err) {
    console.error("[faq:import]", err)
    return { success: false, error: err instanceof Error ? err.message : "Import failed." }
  }
}

/** CSV text for the downloadable template (instructions + starter questions, blank answers). */
export async function getFaqTemplateCsv(): Promise<string> {
  await requireAdmin()
  return toCsv(
    [...FAQ_CSV_HEADERS],
    [
      ...instructionRows(),
      ...FAQ_SEED.map((s) => ({ category: s.category, question: s.question, answer: "", keywords: "", language: "en", published: "true" })),
    ],
  )
}

/** CSV text of every current FAQ (instructions + rows). */
export async function exportFaqsCsv(): Promise<string> {
  await requireAdmin()
  const faqs = await prisma.faq.findMany({ where: { deletedAt: null }, orderBy: [{ category: "asc" }, { question: "asc" }] })
  return toCsv(
    [...FAQ_CSV_HEADERS],
    [
      ...instructionRows(),
      ...faqs.map((f) => ({
        category: f.category,
        question: f.question,
        answer: f.answer,
        keywords: f.keywords ?? "",
        language: f.language,
        published: String(f.published),
      })),
    ],
  )
}

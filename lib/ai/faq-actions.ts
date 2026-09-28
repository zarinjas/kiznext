"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { parseCsvToObjects, toCsv } from "@/lib/csv"
import { readXlsxGrid } from "@/lib/xlsx-read"
import { SHEET_SA_KEY } from "@/lib/google-sheets"
import { getFaqSheetConfig, fetchFaqSheetRows, FAQ_SHEET_ID_KEY, FAQ_SHEET_RANGE_KEY } from "./faq-sheet"
import { FAQ_SEED, FAQ_CSV_HEADERS } from "./faq-seed"

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session.user.role as Role
}

async function upsertSetting(key: string, value: string) {
  await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
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

/** Insert the starter questions as drafts (skips ones that already exist). */
export async function seedStarterFaqs(): Promise<{ success: boolean; added: number }> {
  try {
    const role = await requireAdmin()
    const existing = await prisma.faq.findMany({ where: { deletedAt: null }, select: { question: true } })
    const have = new Set(existing.map((f) => f.question.trim().toLowerCase()))

    const toAdd = FAQ_SEED.filter((s) => !have.has(s.question.trim().toLowerCase()))
    if (toAdd.length > 0) {
      await prisma.faq.createMany({
        data: toAdd.map((s) => ({ category: s.category, question: s.question, answer: "", keywords: s.keywords, published: true })),
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
  return ["true", "1", "yes", "y", "published", "ya"].includes(v.trim().toLowerCase())
}

function isInstructionRow(category: string, question: string): boolean {
  return category.trim().startsWith("#") || question.trim().startsWith("#")
}

interface FaqImportResult {
  success: boolean
  error?: string
  added?: number
  updated?: number
  skipped?: number
}

/** Shared import: match existing rows by question (case-insensitive). */
async function doImport(rows: Record<string, string>[], role: Role): Promise<FaqImportResult> {
  if (rows.length === 0) return { success: false, error: "The file has no rows." }

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
      language: (row.language ?? "").trim() || "ms",
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
}

/** Import FAQs from CSV text. */
export async function importFaqs(csvText: string): Promise<FaqImportResult> {
  try {
    const role = await requireAdmin()
    const { headers, rows } = parseCsvToObjects(csvText)
    if (!headers.includes("question")) {
      return { success: false, error: "Missing a 'question' column. Download the template for the right format." }
    }
    return await doImport(rows, role)
  } catch (err) {
    console.error("[faq:import]", err)
    return { success: false, error: err instanceof Error ? err.message : "Import failed." }
  }
}

/** Import FAQs from an uploaded file — accepts `.xlsx` (template) or `.csv`. */
export async function importFaqsFile(formData: FormData): Promise<FaqImportResult> {
  try {
    const role = await requireAdmin()
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) return { success: false, error: "No file selected." }

    const buf = Buffer.from(await file.arrayBuffer())
    const isXlsx = buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04

    if (isXlsx) {
      let parsed
      try {
        parsed = readXlsxGrid(buf)
      } catch (err) {
        console.error("[faq:import:xlsx]", err)
        return { success: false, error: "Couldn't read that Excel file. Make sure it's the downloaded template." }
      }
      if (!parsed.headers.includes("question")) {
        return { success: false, error: "No 'question' column found. Use the downloaded template." }
      }
      return await doImport(parsed.rows, role)
    }

    return await importFaqs(buf.toString("utf8"))
  } catch (err) {
    console.error("[faq:importFile]", err)
    return { success: false, error: err instanceof Error ? err.message : "Import failed." }
  }
}

/** CSV text of every current FAQ (clean data, no instruction rows). */
export async function exportFaqsCsv(): Promise<string> {
  await requireAdmin()
  const faqs = await prisma.faq.findMany({ where: { deletedAt: null }, orderBy: [{ category: "asc" }, { question: "asc" }] })
  return toCsv(
    [...FAQ_CSV_HEADERS],
    faqs.map((f) => ({
      category: f.category,
      question: f.question,
      answer: f.answer,
      keywords: f.keywords ?? "",
      language: f.language,
      published: String(f.published),
    })),
  )
}

// ── Google Sheet sync ────────────────────────────────────────────────────────
// Staff edit the FAQ in a shared Google Sheet; the admin pulls it on demand —
// no re-uploading. Shares the service account with the accommodation sync.

interface FaqSheetStatus {
  serviceAccountSet: boolean
  spreadsheetId: string | null
  range: string | null
}

export async function getFaqSheetStatus(): Promise<FaqSheetStatus> {
  await requireAdmin()
  const cfg = await getFaqSheetConfig()
  return { serviceAccountSet: cfg.serviceAccountSet, spreadsheetId: cfg.spreadsheetId, range: cfg.range }
}

export async function saveFaqSheetConfig(input: {
  serviceAccount: string
  spreadsheetId: string
  range: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireAdmin()

    if (input.serviceAccount.trim()) {
      try {
        JSON.parse(input.serviceAccount)
      } catch {
        return { success: false, error: "The service account key is not valid JSON." }
      }
      await upsertSetting(SHEET_SA_KEY, input.serviceAccount.trim())
    }

    await upsertSetting(FAQ_SHEET_ID_KEY, input.spreadsheetId.trim())
    await upsertSetting(FAQ_SHEET_RANGE_KEY, input.range.trim())

    revalidate(role)
    return { success: true }
  } catch (err) {
    console.error("[faq:saveSheetConfig]", err)
    return { success: false, error: err instanceof Error ? err.message : "Couldn't save." }
  }
}

/** Pull the FAQ sheet and import it (same matching rules as a file upload). */
export async function syncFaqsFromSheet(): Promise<FaqImportResult & { fetched?: number }> {
  try {
    const role = await requireAdmin()
    const { rows } = await fetchFaqSheetRows()
    const result = await doImport(rows, role)
    return { ...result, fetched: rows.length }
  } catch (err) {
    console.error("[faq:syncSheet]", err)
    return { success: false, error: err instanceof Error ? err.message : "Sync failed." }
  }
}

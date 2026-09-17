import { prisma } from "@/lib/db"
import { SHEET_SA_KEY, fetchSpreadsheetGrid } from "@/lib/google-sheets"

/**
 * Google Sheets reader for the FAQ knowledge base. Shares the service account
 * with the accommodation sync (`google_service_account`) but keeps its own
 * spreadsheet id + range so the two are independent.
 *
 * Settings (server-only, in `app_settings`):
 *   - `faq_sheet_id`    (the FAQ spreadsheet ID)
 *   - `faq_sheet_range` (e.g. "FAQ!A1:F1000" or just "FAQ"; blank = first sheet)
 */

export const FAQ_SHEET_ID_KEY = "faq_sheet_id"
export const FAQ_SHEET_RANGE_KEY = "faq_sheet_range"

export interface FaqSheetConfig {
  serviceAccount: string | null
  serviceAccountSet: boolean
  spreadsheetId: string | null
  range: string | null
}

export async function getFaqSheetConfig(): Promise<FaqSheetConfig> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [SHEET_SA_KEY, FAQ_SHEET_ID_KEY, FAQ_SHEET_RANGE_KEY] } },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const serviceAccount = map.get(SHEET_SA_KEY) || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null
  return {
    serviceAccount,
    serviceAccountSet: Boolean(serviceAccount),
    spreadsheetId: map.get(FAQ_SHEET_ID_KEY) || null,
    range: map.get(FAQ_SHEET_RANGE_KEY) || null,
  }
}

export interface FaqSheetRows {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Fetch the FAQ sheet and return row objects keyed by header. The header row is
 * detected as the first row containing a `question` cell, so a sheet with a
 * title/instructions above the table still works.
 */
export async function fetchFaqSheetRows(): Promise<FaqSheetRows> {
  const cfg = await getFaqSheetConfig()
  if (!cfg.serviceAccount) throw new Error("Google service account key is not configured.")
  if (!cfg.spreadsheetId) throw new Error("FAQ Google Sheet ID is not configured.")

  let credentials: Record<string, unknown>
  try {
    credentials = JSON.parse(cfg.serviceAccount)
  } catch {
    throw new Error("The Google service account key is not valid JSON.")
  }

  const values = await fetchSpreadsheetGrid({
    credentials,
    spreadsheetId: cfg.spreadsheetId,
    range: cfg.range?.trim() || "A1:Z2000",
  })
  if (values.length === 0) throw new Error("The FAQ sheet returned no rows.")

  const grid = values.map((row) => row.map((cell) => (cell == null ? "" : String(cell)).trim()))
  const headerIndex = grid.findIndex((row) => row.some((cell) => cell.toLowerCase() === "question"))
  if (headerIndex === -1) {
    throw new Error("No 'question' column found in the sheet. Check the header row.")
  }

  const headers = grid[headerIndex].map((h) => h.toLowerCase())
  const rows = grid
    .slice(headerIndex + 1)
    .map((cells) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = cells[i] ?? ""
      })
      return obj
    })
    .filter((r) => Object.values(r).some((v) => v !== ""))

  return { headers, rows }
}

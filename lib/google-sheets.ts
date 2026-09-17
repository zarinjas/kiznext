import { google } from "googleapis"
import { prisma } from "@/lib/db"
import { readXlsxSheetGrid } from "@/lib/xlsx-read"

/**
 * Google Sheets reader for the accommodation sync. Reads VALUES only (the sync
 * logic infers single/twin from bed-row counts and room status from the NAME
 * text, so cell colours are never needed) using a service account with the
 * read-only `spreadsheets.readonly` + `drive.readonly` scopes.
 *
 * Native Google Sheets go through the Sheets API. Uploaded Office files
 * (`.xlsx` / `.xls`) are refused by that API with "The document must not be an
 * Office file", so we fall back to downloading the file through the Drive API
 * (`drive.readonly`) and parsing it locally with `lib/xlsx-read.ts`.
 *
 * Config lives in the `app_settings` key/value store (server-only), with a
 * server `.env` fallback so it survives a DB reset:
 *   - `google_service_account` (the service-account JSON key)
 *   - `google_sheet_id`        (the spreadsheet ID)
 *   - `google_sheet_range`     (e.g. "Sheet1!A1:Z1000" or just "Sheet1")
 */

const SHEET_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
]

/** True when the Sheets API refused a document because it's an Office file. */
function isOfficeFileError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /Office file/i.test(msg) || /not supported for this document/i.test(msg)
}

/** The tab part of an A1 range ("'My Tab'!A1:Z9" → "My Tab"). */
function rangeSheetName(range: string): string | null {
  const tab = range.split("!")[0]?.trim() ?? ""
  return tab.replace(/^'(.*)'$/, "$1").trim() || null
}

/**
 * Read a configured spreadsheet as a 2-D grid, transparently handling native
 * Google Sheets (Sheets API) and uploaded Office files (Drive download + parse).
 */
export async function fetchSpreadsheetGrid(opts: {
  credentials: Record<string, unknown>
  spreadsheetId: string
  range: string | null
}): Promise<(string | number | null)[][]> {
  const auth = new google.auth.GoogleAuth({ credentials: opts.credentials, scopes: SHEET_SCOPES })

  const sheets = google.sheets({ version: "v4", auth })
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: opts.spreadsheetId,
      range: opts.range?.trim() || "A1:ZZ10000",
    })
    return (res.data.values ?? []) as (string | number | null)[][]
  } catch (e) {
    if (!isOfficeFileError(e)) throw e
  }

  const drive = google.drive({ version: "v3", auth })
  const file = await drive.files.get(
    { fileId: opts.spreadsheetId, alt: "media" },
    { responseType: "arraybuffer" },
  )
  const buf = Buffer.from(file.data as unknown as ArrayBuffer)
  const sheetName = opts.range ? rangeSheetName(opts.range) : null
  return readXlsxSheetGrid(buf, sheetName)
}

export const SHEET_SA_KEY = "google_service_account"
export const SHEET_ID_KEY = "google_sheet_id"
export const SHEET_RANGE_KEY = "google_sheet_range"

export interface SheetConfig {
  serviceAccount: string | null
  spreadsheetId: string | null
  range: string | null
}

export async function getSheetConfig(): Promise<SheetConfig> {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: [SHEET_SA_KEY, SHEET_ID_KEY, SHEET_RANGE_KEY] } },
  })
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return {
    serviceAccount: map.get(SHEET_SA_KEY) || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || null,
    spreadsheetId: map.get(SHEET_ID_KEY) || process.env.GOOGLE_SHEET_ID || null,
    range: map.get(SHEET_RANGE_KEY) || process.env.GOOGLE_SHEET_RANGE || null,
  }
}

/** Turn a Sheets `values` 2-D array into CSV text (header row first). */
export function sheetValuesToCsv(values: (string | number | null | undefined)[][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return values.map((row) => row.map(esc).join(",")).join("\r\n")
}

/** Fetch the configured range and return it as CSV text. */
export async function fetchSheetCsv(): Promise<string> {
  const cfg = await getSheetConfig()
  if (!cfg.serviceAccount) throw new Error("Google service account key is not configured.")
  if (!cfg.spreadsheetId) throw new Error("Google Sheet ID is not configured.")
  if (!cfg.range) throw new Error("Google Sheet range (tab name) is not configured.")

  let credentials: Record<string, unknown>
  try {
    credentials = JSON.parse(cfg.serviceAccount)
  } catch {
    throw new Error("The Google service account key is not valid JSON.")
  }

  const values = await fetchSpreadsheetGrid({
    credentials,
    spreadsheetId: cfg.spreadsheetId,
    range: cfg.range,
  })
  if (values.length === 0) throw new Error("The Google Sheet returned no rows.")
  return sheetValuesToCsv(values)
}

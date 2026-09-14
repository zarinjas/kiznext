import { google } from "googleapis"
import { prisma } from "@/lib/db"

/**
 * Google Sheets reader for the accommodation sync. Reads VALUES only (the sync
 * logic infers single/twin from bed-row counts and room status from the NAME
 * text, so cell colours are never needed) using a service account with the
 * minimal `spreadsheets.readonly` scope.
 *
 * Config lives in the `app_settings` key/value store (server-only), with a
 * server `.env` fallback so it survives a DB reset:
 *   - `google_service_account` (the service-account JSON key)
 *   - `google_sheet_id`        (the spreadsheet ID)
 *   - `google_sheet_range`     (e.g. "Sheet1!A1:Z1000" or just "Sheet1")
 */

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

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const sheets = google.sheets({ version: "v4", auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: cfg.spreadsheetId,
    range: cfg.range,
  })
  const values = (res.data.values ?? []) as (string | number | null)[][]
  if (values.length === 0) throw new Error("The Google Sheet returned no rows.")
  return sheetValuesToCsv(values)
}

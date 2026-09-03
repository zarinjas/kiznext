/**
 * Minimal, dependency-free CSV parser + serializer.
 *
 * Handles the subset needed for the eKolej accepted-student export:
 * quoted fields, escaped quotes (""), commas inside quotes, and CRLF/LF line
 * endings. No streaming — the accepted list is small (hundreds of rows), so we
 * parse the whole string in memory. This deliberately avoids adding a library
 * (papaparse / SheetJS) per the no-new-deps rule in AGENTS.md.
 */

/** Parse CSV text into an array of string cells per row. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  // Strip a leading UTF-8 BOM if Excel added one.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < src.length; i++) {
    const c = src[i]

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }

    if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (c === "\r") {
      // swallow; the \n branch closes the row
    } else {
      field += c
    }
  }

  // Trailing field / row (file without a final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully-empty trailing rows.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""))
}

/**
 * Parse CSV into an array of objects keyed by the (trimmed) header row.
 * Returns the raw header list too, so callers can report unmapped columns.
 */
export function parseCsvToObjects(text: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const grid = parseCsv(text)
  if (grid.length === 0) return { headers: [], rows: [] }

  const headers = grid[0].map((h) => h.trim())
  const rows = grid.slice(1).map((cells) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim()
    })
    return obj
  })

  return { headers, rows }
}

/** Serialize rows (array of objects) back to CSV text for export. */
export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.map(esc).join(",")]
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","))
  }
  return lines.join("\r\n")
}

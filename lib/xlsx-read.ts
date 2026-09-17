import { inflateRawSync } from "node:zlib"

/**
 * Minimal, dependency-free `.xlsx` reader.
 *
 * An .xlsx is a ZIP of XML parts. We locate the worksheet whose header row
 * contains "question", then read shared strings + inline strings into a grid.
 * Only enough to import a staff-filled FAQ template — not a general reader.
 * Node-only (uses zlib to inflate DEFLATE entries that Excel writes).
 */

interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  localOffset: number
}

function readZipEntries(buf: Buffer): ZipEntry[] {
  // End Of Central Directory: scan backwards for its signature.
  let eocd = -1
  const min = Math.max(0, buf.length - 22 - 0xffff)
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new Error("Not a valid .xlsx (zip) file")

  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compressedSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28)
    const extraLen = buf.readUInt16LE(p + 30)
    const commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen)
    entries.push({ name, method, compressedSize, localOffset })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

function extractEntry(buf: Buffer, entry: ZipEntry): Buffer {
  const nameLen = buf.readUInt16LE(entry.localOffset + 26)
  const extraLen = buf.readUInt16LE(entry.localOffset + 28)
  const start = entry.localOffset + 30 + nameLen + extraLen
  const raw = buf.subarray(start, start + entry.compressedSize)
  return entry.method === 0 ? raw : inflateRawSync(raw)
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
}

/** All `<t>` text runs joined — handles rich-text runs inside a cell/string. */
function textRuns(xml: string): string {
  const out: string[] = []
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(decodeXml(m[1]))
  return out.join("")
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return []
  const out: string[] = []
  const re = /<si>([\s\S]*?)<\/si>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) out.push(textRuns(m[1]))
  return out
}

function colIndex(ref: string): number {
  let n = 0
  for (let i = 0; i < ref.length; i++) n = n * 26 + (ref.charCodeAt(i) - 64)
  return n - 1
}

/**
 * Excel stores dates as a serial day count. Convert to "YYYY-MM-DD" (the epoch
 * 1899-12-30 absorbs Excel's 1900 leap-year bug for every modern date).
 */
function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 2958465) return null
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Built-in numFmtId values that render as a date/time. */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56,
  57, 58,
])

/** A custom format code is a date when it uses a y/d/h/s token (quotes stripped). */
function looksLikeDateFormat(formatCode: string): boolean {
  const cleaned = formatCode.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "")
  return /[ydhs]/i.test(cleaned)
}

/**
 * The set of `cellXfs` style indices that render as dates, so numeric cells can
 * be converted from their serial. Without this a date cell like `15/09/2026`
 * comes back as `"46279"`.
 */
function parseDateStyles(stylesXml: string | undefined): Set<number> {
  const dateStyles = new Set<number>()
  if (!stylesXml) return dateStyles

  const dateIds = new Set<number>(BUILTIN_DATE_FORMATS)
  const numFmtRe = /<numFmt\b[^>]*>/g
  let fmt: RegExpExecArray | null
  while ((fmt = numFmtRe.exec(stylesXml))) {
    const id = /\bnumFmtId="(\d+)"/.exec(fmt[0])?.[1]
    const code = /\bformatCode="([^"]*)"/.exec(fmt[0])?.[1]
    if (id && code && looksLikeDateFormat(code)) dateIds.add(Number(id))
  }

  const xfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1]
  if (!xfs) return dateStyles
  const xfRe = /<xf\b[^>]*>/g
  let index = 0
  let xf: RegExpExecArray | null
  while ((xf = xfRe.exec(xfs))) {
    const id = /\bnumFmtId="(\d+)"/.exec(xf[0])?.[1]
    if (id && dateIds.has(Number(id))) dateStyles.add(index)
    index++
  }
  return dateStyles
}

function parseSheet(xml: string, shared: string[], dateStyles: Set<number>): string[][] {
  const grid: string[][] = []
  const rowRe = /<row[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRe.exec(xml))) {
    const cells: string[] = []
    const cellRe = /<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g
    let cellMatch: RegExpExecArray | null

    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[1] ?? cellMatch[2] ?? ""
      const inner = cellMatch[3] ?? ""
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1]
      const type = /t="([^"]+)"/.exec(attrs)?.[1]
      const style = Number(/\bs="(\d+)"/.exec(attrs)?.[1] ?? "-1")
      const idx = ref ? colIndex(ref) : cells.length

      let value = ""
      if (type === "s") {
        const v = /<v>(\d+)<\/v>/.exec(inner)?.[1]
        value = v != null ? (shared[Number(v)] ?? "") : ""
      } else if (type === "inlineStr") {
        value = textRuns(inner)
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
        if (v == null || v.trim() === "") {
          value = ""
        } else if (type == null) {
          // Numeric cell. Excel stores every number as a double, so `101` comes
          // back as `<v>101.0</v>` and a phone as `<v>1.110010675E9</v>`.
          // Normalise to the plain number so parsers see "101", not "101.0".
          const n = Number(v)
          const asDate = dateStyles.has(style) ? excelSerialToDate(n) : null
          value = asDate ?? (Number.isFinite(n) ? String(n) : decodeXml(v))
        } else {
          value = decodeXml(v)
        }
      }
      cells[idx] = value
    }

    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = ""
    grid.push(cells)
  }
  return grid
}

interface SheetRef {
  name: string
  path: string
}

/**
 * Map workbook tab names to their worksheet part paths. Uses `xl/workbook.xml`
 * + its rels so a named tab can be selected; falls back to sheet order when the
 * workbook part is missing.
 */
function resolveSheetRefs(buf: Buffer, entries: ZipEntry[]): SheetRef[] {
  const fallback = () =>
    entries
      .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((e, i) => ({ name: `Sheet${i + 1}`, path: e.name }))

  const workbook = entries.find((e) => e.name === "xl/workbook.xml")
  if (!workbook) return fallback()

  const relMap = new Map<string, string>()
  const relEntry = entries.find((e) => e.name === "xl/_rels/workbook.xml.rels")
  if (relEntry) {
    const relXml = extractEntry(buf, relEntry).toString("utf8")
    const re = /<Relationship\b[^>]*>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(relXml))) {
      const id = /\bId="([^"]+)"/.exec(m[0])?.[1]
      const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1]
      if (id && target) relMap.set(id, target)
    }
  }

  const refs: SheetRef[] = []
  const wbXml = extractEntry(buf, workbook).toString("utf8")
  const re = /<sheet\b[^>]*>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(wbXml))) {
    const name = decodeXml(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? "")
    const rid = /\br:id="([^"]+)"/.exec(m[0])?.[1]
    const target = rid ? relMap.get(rid) : undefined
    if (!target) continue
    const path = target.startsWith("/")
      ? target.slice(1)
      : target.startsWith("xl/")
        ? target
        : `xl/${target}`
    refs.push({ name, path })
  }
  return refs.length > 0 ? refs : fallback()
}

/** Strip A1-notation quoting from a sheet name ("'My Tab'" → "My Tab"). */
function normaliseSheetName(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/^'(.*)'$/, "$1").trim()
}

/**
 * Read any worksheet into a 2-D grid. When `sheetName` is given the matching tab
 * is used (exact, then partial match); otherwise the first non-empty tab wins.
 * Cells are strings; numbers keep their raw value.
 */
export function readXlsxSheetGrid(buf: Buffer, sheetName?: string | null): string[][] {
  const entries = readZipEntries(buf)
  const sharedEntry = entries.find((e) => e.name === "xl/sharedStrings.xml")
  const shared = sharedEntry ? parseSharedStrings(extractEntry(buf, sharedEntry).toString("utf8")) : []
  const stylesEntry = entries.find((e) => e.name === "xl/styles.xml")
  const dateStyles = parseDateStyles(stylesEntry ? extractEntry(buf, stylesEntry).toString("utf8") : undefined)
  const refs = resolveSheetRefs(buf, entries)

  const gridOf = (path: string): string[][] | null => {
    const entry = entries.find((e) => e.name === path)
    return entry ? parseSheet(extractEntry(buf, entry).toString("utf8"), shared, dateStyles) : null
  }

  // xlsx forbids `/ : \ ? * [ ]` in tab names, so Google's tab ("...2026/2027")
  // and the exported worksheet name can differ. Compare alphanumerics only.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "")
  const wanted = norm(normaliseSheetName(sheetName))
  if (wanted) {
    const match =
      refs.find((r) => norm(r.name) === wanted) ??
      refs.find((r) => {
        const n = norm(r.name)
        return n.includes(wanted) || wanted.includes(n)
      })
    if (match) return gridOf(match.path) ?? []
  }

  for (const ref of refs) {
    const grid = gridOf(ref.path)
    if (grid && grid.length > 0) return grid
  }
  return []
}

export interface XlsxGrid {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Read the worksheet whose header row contains a `question` column. Returns the
 * header list and row objects (trimmed string cells), matching the CSV importer.
 */
export function readXlsxGrid(buf: Buffer): XlsxGrid {
  const entries = readZipEntries(buf)
  const shared = parseSharedStrings(
    entries.find((e) => e.name === "xl/sharedStrings.xml")
      ? extractEntry(buf, entries.find((e) => e.name === "xl/sharedStrings.xml")!).toString("utf8")
      : undefined,
  )
  const stylesEntry = entries.find((e) => e.name === "xl/styles.xml")
  const dateStyles = parseDateStyles(stylesEntry ? extractEntry(buf, stylesEntry).toString("utf8") : undefined)

  const sheetEntries = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const sheet of sheetEntries) {
    const grid = parseSheet(extractEntry(buf, sheet).toString("utf8"), shared, dateStyles)
    if (grid.length === 0) continue
    const headers = grid[0].map((h) => (h ?? "").trim())
    if (!headers.some((h) => h.toLowerCase() === "question")) continue

    const rows = grid
      .slice(1)
      .map((cells) => {
        const obj: Record<string, string> = {}
        headers.forEach((h, i) => {
          obj[h] = (cells[i] ?? "").trim()
        })
        return obj
      })
      .filter((r) => Object.values(r).some((v) => v !== ""))

    return { headers, rows }
  }

  return { headers: [], rows: [] }
}

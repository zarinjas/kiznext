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

function parseSheet(xml: string, shared: string[]): string[][] {
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
      const idx = ref ? colIndex(ref) : cells.length

      let value = ""
      if (type === "s") {
        const v = /<v>(\d+)<\/v>/.exec(inner)?.[1]
        value = v != null ? (shared[Number(v)] ?? "") : ""
      } else if (type === "inlineStr") {
        value = textRuns(inner)
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1]
        value = v != null ? decodeXml(v) : ""
      }
      cells[idx] = value
    }

    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = ""
    grid.push(cells)
  }
  return grid
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

  const sheetEntries = entries
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const sheet of sheetEntries) {
    const grid = parseSheet(extractEntry(buf, sheet).toString("utf8"), shared)
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

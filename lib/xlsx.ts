/**
 * Minimal, dependency-free `.xlsx` writer.
 *
 * An .xlsx file is just a ZIP archive of XML parts. We build a valid workbook
 * with one worksheet per sheet, frozen header row, an auto-filter, and a bold
 * header style — enough for staff to open it in Excel and edit it. Strings are
 * written inline (no sharedStrings) to keep the writer tiny.
 *
 * Pure browser/Node-safe code: only TextEncoder, DataView and Uint8Array.
 * No spreadsheet library is added (see the no-new-deps rule in AGENTS.md).
 */

export interface XlsxSheet {
  /** Worksheet tab name (sanitised + de-duplicated automatically). */
  name: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

/** Build a ZIP archive using the "store" method (no compression). */
function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let offset = 0
  const dosTime = 0
  const dosDate = 0x21 // 1980-01-01, a valid DOS date

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const crc = crc32(file.data)
    const size = file.data.length

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0, true)
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, dosTime, true)
    lv.setUint16(12, dosDate, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    localChunks.push(local, file.data)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, dosTime, true)
    cv.setUint16(14, dosDate, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centralChunks.push(central)

    offset += local.length + file.data.length
  }

  const centralSize = centralChunks.reduce((n, c) => n + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return concat([...localChunks, ...centralChunks, end])
}

function escXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** 0 → "A", 25 → "Z", 26 → "AA". */
function colName(index: number): string {
  let n = index + 1
  let name = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

/** Excel sheet names: ≤31 chars, no : \ / ? * [ ], non-empty, unique. */
function sanitiseSheetName(raw: string, used: Set<string>): string {
  let base = (raw || "Sheet").replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31)
  if (!base) base = "Sheet"
  let name = base
  let i = 2
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i})`
    name = base.slice(0, 31 - suffix.length) + suffix
    i++
  }
  used.add(name.toLowerCase())
  return name
}

function cell(ref: string, value: string | number | null | undefined, style = 0): string {
  if (value == null || value === "") {
    return style ? `<c r="${ref}" s="${style}"/>` : `<c r="${ref}"/>`
  }
  const styleAttr = style ? ` s="${style}"` : ""
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
  }
  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escXml(String(value))}</t></is></c>`
}

function sheetXml(sheet: XlsxSheet): string {
  const headers = sheet.headers
  const allRows: (string | number | null | undefined)[][] = [headers, ...sheet.rows]
  const lastCol = colName(Math.max(headers.length - 1, 0))
  const lastRow = Math.max(allRows.length, 1)

  const cols = headers
    .map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(h.length + 4, 12), 40)}" customWidth="1"/>`)
    .join("")

  const rows = allRows
    .map((row, r) => {
      const cells = headers
        .map((_, c) => cell(`${colName(c)}${r + 1}`, row[c], r === 0 ? 1 : 0))
        .join("")
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows}</sheetData>
<autoFilter ref="A1:${lastCol}${lastRow}"/>
</worksheet>`
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`

/** Build a multi-sheet `.xlsx` Blob (one worksheet per entry in `sheets`). */
export function buildXlsx(sheets: XlsxSheet[]): Blob {
  const encoder = new TextEncoder()
  const usedNames = new Set<string>()
  const prepared = sheets.map((s) => ({ ...s, safeName: sanitiseSheetName(s.name, usedNames) }))

  const files: { name: string; data: Uint8Array }[] = []
  const add = (name: string, xml: string) => files.push({ name, data: encoder.encode(xml) })

  // Content types
  const sheetOverrides = prepared
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("")
  add(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheetOverrides}
</Types>`,
  )

  add(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  )

  const sheetTags = prepared
    .map((s, i) => `<sheet name="${escXml(s.safeName)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")
  add(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheetTags}</sheets>
</workbook>`,
  )

  const sheetRels = prepared
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("")
  const stylesRid = `rId${prepared.length + 1}`
  add(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheetRels}
<Relationship Id="${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  )

  add("xl/styles.xml", STYLES_XML)
  prepared.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)))

  const bytes = zip(files)
  return new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

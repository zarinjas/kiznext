import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

/**
 * Serves the pdf.js library from node_modules, mirroring `/api/pdf-worker`.
 *
 * The mobile PDF reader renders inside a WebView using pdf.js, so it needs the
 * library as a real ES module it can `import()` from a same-origin URL. Serving
 * it here (rather than bundling ~435KB into the app) keeps the mobile bundle
 * lean and guarantees the library and its worker always come from the same
 * version.
 */
export const runtime = "nodejs"

const LIB_PATH = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.min.mjs"
)

let cached: Buffer | null = null

export async function GET() {
  try {
    if (!cached) cached = await readFile(LIB_PATH)
  } catch {
    return NextResponse.json({ error: "PDF library not found" }, { status: 500 })
  }
  return new NextResponse(new Uint8Array(cached), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}

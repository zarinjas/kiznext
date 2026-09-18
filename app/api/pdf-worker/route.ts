import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

/**
 * Serves pdf.js's web worker from node_modules. The worker is an ES module that
 * pdf.js loads with `new Worker(src, { type: "module" })`; bundling it through
 * Turbopack is brittle, so we stream it from the installed package instead.
 * Same-origin by design (`/api/pdf-worker`) so the worker can start.
 *
 * Resolved from `process.cwd()` rather than `require.resolve`, because the
 * bundler rewrites `require.resolve` to a numeric module id.
 */
export const runtime = "nodejs"

const WORKER_PATH = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.min.mjs"
)

let cached: Buffer | null = null

export async function GET() {
  try {
    if (!cached) cached = await readFile(WORKER_PATH)
  } catch {
    return NextResponse.json({ error: "PDF worker not found" }, { status: 500 })
  }
  return new NextResponse(new Uint8Array(cached), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}

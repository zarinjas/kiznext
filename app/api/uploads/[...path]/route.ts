import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

// Serves files from public/uploads dynamically. `next start` only serves files
// that existed in public/ at build time; anything uploaded at runtime (logo,
// login background, facility photos, …) 404s when fetched as a static file.
// A `rewrites()` rule in next.config.ts maps /uploads/:path* here so every
// upload is read from disk on demand instead.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads")

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  ico: "image/x-icon",
  pdf: "application/pdf",
  txt: "text/plain",
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  if (!segments || segments.length === 0) {
    return new NextResponse(null, { status: 404 })
  }

  const rel = segments.join("/")
  if (rel.includes("..") || rel.includes("\0")) {
    return new NextResponse(null, { status: 400 })
  }

  const abs = path.join(UPLOAD_ROOT, rel)
  if (!abs.startsWith(UPLOAD_ROOT)) {
    return new NextResponse(null, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = await readFile(abs)
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const ext = path.extname(abs).slice(1).toLowerCase()
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

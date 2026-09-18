import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { prisma } from "@/lib/db"

// Serves the browser/app icon at a PNG derived from the admin-uploaded app
// logo (AppSetting key `app_logo`). Dynamic so a logo change is reflected
// without a rebuild; falls back to the static default icon
// (`/default-favicon.ico`) when no logo is set.
//
// `?size=192` is used by the PWA manifest (which needs a real 192px icon);
// anything else defaults to 512.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const DEFAULT_SIZE = 512
const ALLOWED_SIZES = new Set([192, 512])
const APP_LOGO_KEY = "app_logo"

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
}

const FALLBACK_PATH = path.join(process.cwd(), "public", "default-favicon.ico")

function requestedSize(req: NextRequest): number {
  const raw = Number(req.nextUrl.searchParams.get("size"))
  return ALLOWED_SIZES.has(raw) ? raw : DEFAULT_SIZE
}

/** Resize a decodable raster to a square PNG; hand back the raw bytes if not. */
async function asPng(buffer: Buffer, size: number): Promise<Buffer | null> {
  try {
    return await sharp(buffer, { failOn: "none" }).resize(size, size).png().toBuffer()
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const size = requestedSize(req)

  async function fallback() {
    try {
      const bytes = await readFile(FALLBACK_PATH)
      const png = await asPng(bytes, size)
      if (png) {
        return new NextResponse(new Uint8Array(png), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
        })
      }
      return new NextResponse(new Uint8Array(bytes), {
        headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=300" },
      })
    } catch {
      return new NextResponse(null, { status: 204 })
    }
  }

  const setting = await prisma.appSetting.findUnique({ where: { key: APP_LOGO_KEY } })
  const logoUrl = setting?.value
  if (!logoUrl || !logoUrl.startsWith("/uploads/") || logoUrl.includes("..")) {
    return fallback()
  }

  const absPath = path.join(process.cwd(), "public", logoUrl)
  const ext = path.extname(absPath).slice(1).toLowerCase()
  const mime = MIME_BY_EXT[ext] ?? "application/octet-stream"

  let buffer: Buffer
  try {
    buffer = await readFile(absPath)
  } catch {
    return fallback()
  }

  if (ext === "svg") {
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
    })
  }

  const png = await asPng(buffer, size)
  if (png) {
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
    })
  }

  // Not a raster we can decode (or sharp unavailable) — hand back the raw file.
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": mime, "Cache-Control": "public, max-age=60" },
  })
}

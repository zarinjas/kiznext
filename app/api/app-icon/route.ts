import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { prisma } from "@/lib/db"

// Serves the browser/app icon at a fixed 512x512 PNG derived from the
// admin-uploaded app logo (AppSetting key `app_logo`). Dynamic so a logo
// change is reflected without a rebuild; falls back to the static default
// icon (`/default-favicon.ico`) when no logo is set.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ICON_SIZE = 512
const APP_LOGO_KEY = "app_logo"

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
}

const FALLBACK_PATH = path.join(process.cwd(), "public", "default-favicon.ico")

export async function GET() {
  async function fallback() {
    try {
      const bytes = await readFile(FALLBACK_PATH)
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

  try {
    const resized = await sharp(buffer, { failOn: "none" }).resize(ICON_SIZE, ICON_SIZE).png().toBuffer()
    return new NextResponse(new Uint8Array(resized), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
    })
  } catch {
    // Not a raster we can decode (or sharp unavailable) — hand back the raw file.
    new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=60" },
    })
  }
}

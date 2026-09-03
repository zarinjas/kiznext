import { randomBytes } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import sharp from "sharp"

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads")

/** Shared hard cap. Callers can pass a smaller maxBytes for specific fields. */
export const DEFAULT_MAX_UPLOAD = 15 * 1024 * 1024

/** Refuse to decode absurdly large images (guards against decompression bombs). */
const MAX_PIXELS = 60_000_000

/** Formats every modern browser renders natively — kept as-is (pass-through). */
const PASSTHROUGH_EXT: Record<string, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
}

export class UploadError extends Error {}

export interface SaveUploadOptions {
  /** Subdirectory under public/uploads/ ("" = root). */
  dir?: string
  /** Filename prefix. Defaults to "upload". */
  prefix?: string
  /** Byte cap on the uploaded file. Defaults to DEFAULT_MAX_UPLOAD. */
  maxBytes?: number
  /** Allow PDF uploads (stored as-is after a header check). */
  allowPdf?: boolean
  /** Allow SVG uploads (stored as-is). */
  allowSvg?: boolean
}

/**
 * Validate + normalise an uploaded file and write it to public/uploads.
 *
 * The upload is never trusted: the real format is sniffed from the content
 * (via sharp, not the browser's `file.type`), and the whole file must decode
 * cleanly before anything is persisted. Web-safe rasters (jpeg/png/webp/gif)
 * are written through unchanged; exotic phone/camera formats (HEIC, TIFF,
 * BMP, AVIF…) are re-encoded to jpeg (or png when they carry alpha) so the
 * stored file is always something the browser preview can render — this is
 * what previously produced "corrupt" / broken images from iPhone uploads.
 *
 * Throws UploadError with a user-friendly message on any bad input.
 */
export async function saveUpload(
  input: Buffer,
  options: SaveUploadOptions = {},
): Promise<{ url: string; filename: string }> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_UPLOAD

  if (input.length === 0) {
    throw new UploadError("The file is empty.")
  }
  if (input.length > maxBytes) {
    throw new UploadError(`That file is too large — the limit is ${Math.round(maxBytes / 1024 / 1024)}MB.`)
  }

  const { buffer, ext } = await normalizeUpload(input, options)

  if (buffer.length > maxBytes) {
    throw new UploadError("The processed file is too large — try a smaller image.")
  }

  const prefix = options.prefix ?? "upload"
  const filename = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`
  const dir = path.join(UPLOAD_ROOT, options.dir ?? "")
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), buffer)

  const rel = options.dir ? `${options.dir}/${filename}` : filename
  return { url: `/uploads/${rel}`, filename }
}

async function normalizeUpload(
  input: Buffer,
  options: SaveUploadOptions,
): Promise<{ buffer: Buffer; ext: string }> {
  // PDFs aren't images — check the magic bytes before sharp gets involved.
  if (input.subarray(0, 5).toString("latin1") === "%PDF-") {
    if (!options.allowPdf) {
      throw new UploadError("PDF files aren't allowed here.")
    }
    return { buffer: input, ext: "pdf" }
  }

  let format: string | undefined
  try {
    const meta = await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata()
    format = meta.format
  } catch {
    throw new UploadError("That file isn't a readable image.")
  }

  if (format === "svg") {
    if (!options.allowSvg) {
      throw new UploadError("SVG files aren't allowed here.")
    }
    return { buffer: input, ext: "svg" }
  }

  if (format && PASSTHROUGH_EXT[format]) {
    // Proven fully-decodable so we never store a truncated/corrupt file.
    try {
      await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).toBuffer()
    } catch {
      throw new UploadError("That file looks corrupted or cut off — try uploading it again.")
    }
    return { buffer: input, ext: PASSTHROUGH_EXT[format] }
  }

  // Everything else sharp can decode (HEIC/HEIF, TIFF, BMP, AVIF, …) is
  // re-encoded into a browser-safe format. `.rotate()` also bakes in the
  // EXIF orientation so phone photos never show up sideways.
  let hasAlpha = false
  try {
    hasAlpha = !!(await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata())
      .hasAlpha
  } catch {
    // metadata() already succeeded above — ignore, fall through to the encode.
  }

  try {
    const img = sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).rotate()
    if (hasAlpha) {
      return { buffer: await img.png().toBuffer(), ext: "png" }
    }
    return { buffer: await img.jpeg({ quality: 86 }).toBuffer(), ext: "jpg" }
  } catch {
    throw new UploadError("That file isn't a readable image.")
  }
}

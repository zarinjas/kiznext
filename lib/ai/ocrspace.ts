import type { VisionOcrBlock } from "./google-vision"

/**
 * OCR.space — a dedicated OCR engine (not a vision LLM), free forever up to
 * 25,000 requests/month with no card on file. KIZ Lens's primary OCR step:
 * genuinely zero cost, and a purpose-built text-detection pipeline reads
 * faster and more predictably than asking a general vision model to do the
 * same job. Plain REST + API key, no SDK.
 */

const OCR_SPACE_URL = "https://api.ocr.space/parse/image"
const TIMEOUT_MS = 15_000

interface OcrSpaceWord {
  WordText?: string
  Left?: number
  Top?: number
  Width?: number
  Height?: number
}
interface OcrSpaceLine {
  Words?: OcrSpaceWord[]
}
interface OcrSpaceParsedResult {
  ParsedText?: string
  TextOverlay?: { Lines?: OcrSpaceLine[] }
  ErrorMessage?: string | string[]
}
interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[]
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
}

/**
 * Reads width/height straight out of the JPEG's own SOF marker. OCR.space's
 * overlay gives word boxes in pixels but never the source image's own
 * dimensions, so there's nothing else to normalise against — the capture is
 * always a JPEG (see ar-terjemah.tsx / ar-terjemah.ts callers), so this is
 * all that's needed rather than pulling in an image-metadata library.
 */
function getJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++
      continue
    }
    const marker = buf[offset + 1]
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) }
    }
    const segmentLength = buf.readUInt16BE(offset + 2)
    offset += 2 + segmentLength
  }
  return null
}

/** Read text + word-group bounding boxes off an image. Null on any failure. */
export async function ocrViaOcrSpace(apiKey: string, imageBase64: string): Promise<VisionOcrBlock[] | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const dims = getJpegSize(Buffer.from(imageBase64, "base64"))

    const body = new URLSearchParams({
      base64Image: `data:image/jpeg;base64,${imageBase64}`,
      language: "auto",
      OCREngine: "2",
      isOverlayRequired: "true",
      scale: "true",
    })

    const res = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => "")
      console.error(`[ar-translate] OCR.space request failed (${res.status}): ${raw.slice(0, 300)}`)
      return null
    }

    const data = (await res.json()) as OcrSpaceResponse
    if (data.IsErroredOnProcessing) {
      console.error("[ar-translate] OCR.space returned an error:", data.ErrorMessage)
      return null
    }

    const first = data.ParsedResults?.[0]
    if (!first) return null
    if (first.ErrorMessage) {
      console.error("[ar-translate] OCR.space result error:", first.ErrorMessage)
      return null
    }

    const lines = first.TextOverlay?.Lines ?? []
    const blocks: VisionOcrBlock[] = []
    for (const line of lines) {
      const words = (line.Words ?? []).filter((w) => (w.WordText ?? "").trim())
      const text = words.map((w) => w.WordText).join(" ").trim()
      if (!text) continue

      let box: VisionOcrBlock["box"] = null
      if (dims && dims.width > 0 && dims.height > 0) {
        const minX = Math.min(...words.map((w) => w.Left ?? 0))
        const minY = Math.min(...words.map((w) => w.Top ?? 0))
        const maxX = Math.max(...words.map((w) => (w.Left ?? 0) + (w.Width ?? 0)))
        const maxY = Math.max(...words.map((w) => (w.Top ?? 0) + (w.Height ?? 0)))
        if (maxX > minX && maxY > minY) {
          box = {
            x: Math.max(0, Math.min(1, minX / dims.width)),
            y: Math.max(0, Math.min(1, minY / dims.height)),
            w: Math.min(1, (maxX - minX) / dims.width),
            h: Math.min(1, (maxY - minY) / dims.height),
          }
        }
      }
      blocks.push({ text, box })
    }

    // Overlay parsing came up empty but plain text still came back — surface
    // it without a box rather than throwing away a successful read.
    if (blocks.length === 0 && first.ParsedText?.trim()) {
      return [{ text: first.ParsedText.trim(), box: null }]
    }
    return blocks.length > 0 ? blocks : null
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[ar-translate] OCR.space request timed out")
    } else {
      console.error("[ar-translate] OCR.space request threw", err instanceof Error ? err.message : err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

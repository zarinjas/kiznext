/**
 * Google Cloud Vision — dedicated OCR (text detection), not a general vision
 * LLM. Used as KIZ Lens's fastest OCR step (~869ms typical, vs. several
 * seconds for even a lightweight vision LLM), free for the first 1,000
 * requests/month. Plain REST + API key, no SDK dependency — same pattern as
 * calling Gemini with `?key=` in lib/ai/provider.ts.
 *
 * It only reads text; it has no idea what language to translate into, so the
 * caller (lib/ar-translate.ts) always follows this with a separate translate
 * step against a different provider.
 */

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
const TIMEOUT_MS = 15_000

export interface VisionOcrBlock {
  text: string
  /** Normalised 0..1 position, or null if the page size was missing. */
  box: { x: number; y: number; w: number; h: number } | null
}

interface Vertex {
  x?: number
  y?: number
}
interface Symbol_ {
  text: string
}
interface Word {
  symbols?: Symbol_[]
}
interface Paragraph {
  words?: Word[]
}
interface Block {
  boundingBox?: { vertices?: Vertex[] }
  paragraphs?: Paragraph[]
}
interface Page {
  width?: number
  height?: number
  blocks?: Block[]
}
interface VisionResponse {
  responses?: {
    fullTextAnnotation?: { pages?: Page[] }
    error?: { message?: string }
  }[]
}

function wordText(word: Word): string {
  return (word.symbols ?? []).map((s) => s.text).join("")
}

function blockText(block: Block): string {
  return (block.paragraphs ?? [])
    .map((p) => (p.words ?? []).map(wordText).join(" "))
    .join(" ")
    .trim()
}

function blockBox(block: Block, pageWidth: number, pageHeight: number): VisionOcrBlock["box"] {
  const vertices = block.boundingBox?.vertices
  if (!vertices || vertices.length === 0 || !pageWidth || !pageHeight) return null
  const xs = vertices.map((v) => v.x ?? 0)
  const ys = vertices.map((v) => v.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  if (maxX <= minX || maxY <= minY) return null
  return {
    x: Math.max(0, Math.min(1, minX / pageWidth)),
    y: Math.max(0, Math.min(1, minY / pageHeight)),
    w: Math.min(1, (maxX - minX) / pageWidth),
    h: Math.min(1, (maxY - minY) / pageHeight),
  }
}

/** Read text + block-level bounding boxes off an image. Null on any failure. */
export async function ocrViaGoogleVision(
  apiKey: string,
  imageBase64: string
): Promise<VisionOcrBlock[] | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${VISION_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          },
        ],
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const raw = await res.text().catch(() => "")
      console.error(`[ar-translate] Google Vision request failed (${res.status}): ${raw.slice(0, 300)}`)
      return null
    }
    const data = (await res.json()) as VisionResponse
    const first = data.responses?.[0]
    if (!first || first.error) {
      if (first?.error) console.error("[ar-translate] Google Vision returned an error:", first.error.message)
      return null
    }

    const page = first.fullTextAnnotation?.pages?.[0]
    if (!page) return null // no text detected in the image — not an error
    const width = page.width ?? 0
    const height = page.height ?? 0

    const blocks = (page.blocks ?? [])
      .map((b) => ({ text: blockText(b), box: blockBox(b, width, height) }))
      .filter((b) => b.text)
    return blocks.length > 0 ? blocks : null
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[ar-translate] Google Vision request timed out")
    } else {
      console.error("[ar-translate] Google Vision request threw", err instanceof Error ? err.message : err)
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

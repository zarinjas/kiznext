"use client"

/**
 * Client-only pdf.js loader. The worker is served from `/api/pdf-worker`
 * (see that route) so nothing needs bundling; pdf.js is imported lazily so the
 * library only loads on surfaces that actually render a PDF.
 */

type PdfjsModule = typeof import("pdfjs-dist")

let pdfjsPromise: Promise<PdfjsModule> | null = null

export function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/api/pdf-worker"
      return mod
    })
  }
  return pdfjsPromise
}

/** Reads a PDF's page count without keeping the document open. */
export async function getPdfPageCount(url: string): Promise<number | null> {
  try {
    const pdfjs = await loadPdfjs()
    const doc = await pdfjs.getDocument({ url }).promise
    const count = doc.numPages
    await doc.destroy()
    return count
  } catch {
    return null
  }
}

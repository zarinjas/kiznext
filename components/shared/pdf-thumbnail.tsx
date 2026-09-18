"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import Box from "@mui/material/Box"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"
import { loadPdfjs } from "@/lib/pdf-client"

/**
 * Renders the first page of a PDF to a canvas so it can be shown as a card
 * thumbnail. Fits the page to the wrapper width (top-aligned) and crops the
 * overflow — pdf.js is loaded lazily via the shared client loader.
 */
export function PdfThumbnail({ url, label }: { url: string; label?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const failed = failedUrl === url

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    let loaded: PDFDocumentProxy | null = null
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        loaded = await pdfjs.getDocument({ url }).promise
        if (cancelled) return
        setDoc(loaded)
      } catch {
        if (!cancelled) setFailedUrl(url)
      }
    })()
    return () => {
      cancelled = true
      loaded?.destroy()
    }
  }, [url])

  useEffect(() => {
    if (!doc || !width) return
    let cancelled = false
    let task: { cancel: () => void } | null = null
    ;(async () => {
      try {
        const page = await doc.getPage(1)
        if (cancelled || !canvasRef.current) return
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: (width / base.width) * dpr })
        const canvas = canvasRef.current
        canvas.width = Math.max(1, Math.floor(viewport.width))
        canvas.height = Math.max(1, Math.floor(viewport.height))
        const renderTask = page.render({ canvas, viewport })
        task = renderTask
        await renderTask.promise
      } catch {
        /* render cancelled or failed — leave the page blank */
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, width])

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={label ?? "PDF preview"}
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: color.canvasSunk,
      }}
    >
      {failed ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.disabled",
          }}
        >
          <KIcon icon="description" size={30} />
        </Box>
      ) : (
        <Box
          component="canvas"
          ref={canvasRef}
          sx={{ position: "absolute", top: 0, left: 0, display: "block", width: "100%", height: "auto" }}
        />
      )}
    </Box>
  )
}

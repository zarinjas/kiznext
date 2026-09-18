"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { AnimatePresence, motion } from "framer-motion"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import CircularProgress from "@mui/material/CircularProgress"
import useMediaQuery from "@mui/material/useMediaQuery"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { loadPdfjs } from "@/lib/pdf-client"

const DEFAULT_ASPECT = 1 / Math.SQRT2 // A4 portrait fallback

/** Measures a box so the book can be sized to the space it actually has. */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** Renders one PDF page into a canvas at the given CSS size. */
function PdfPage({
  pdf,
  pageNumber,
  width,
  height,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  width: number
  height: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cancelled = false
    let task: { cancel: () => void } | null = null
    ;(async () => {
      const page = await pdf.getPage(pageNumber)
      if (cancelled || !canvasRef.current) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const base = page.getViewport({ scale: 1 })
      const scale = (width / base.width) * dpr
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      const renderTask = page.render({ canvas, viewport })
      task = renderTask
      await renderTask.promise
    })().catch(() => {
      /* render cancelled or failed — leave the page blank */
    })
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pdf, pageNumber, width, height])

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      sx={{
        display: "block",
        width,
        height,
        backgroundColor: "#fff",
        boxShadow: "0 1px 2px rgba(9,9,11,0.06), 0 10px 30px rgba(9,9,11,0.08)",
      }}
    />
  )
}

function BlankPage({ width, height }: { width: number; height: number }) {
  return <Box sx={{ width, height, backgroundColor: color.canvasSunk }} />
}

const variants = {
  enter: (dir: number) => ({ rotateY: dir > 0 ? 62 : -62, opacity: 0 }),
  center: { rotateY: 0, opacity: 1 },
  exit: (dir: number) => ({ rotateY: dir > 0 ? -62 : 62, opacity: 0 }),
}

/**
 * Digital Guide flipbook — a two-page spread on desktop, single page on mobile,
 * with a page-turn transition. pdf.js renders each page to a canvas; the source
 * PDF is never exposed for inline browser viewing (download stays explicit).
 */
export function GuideFlipbook({ url, title }: { url: string; title: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aspect, setAspect] = useState(DEFAULT_ASPECT)
  const [spread, setSpread] = useState(0)
  const [dir, setDir] = useState(1)

  const twoUp = useMediaQuery("(min-width: 900px)")
  const [containerRef, size] = useElementSize<HTMLDivElement>()

  useEffect(() => {
    let doc: PDFDocumentProxy | null = null
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        const loaded = await pdfjs.getDocument({ url }).promise
        if (cancelled) {
          loaded.destroy()
          return
        }
        doc = loaded
        const first = await loaded.getPage(1)
        const vp = first.getViewport({ scale: 1 })
        setAspect(vp.width / vp.height)
        setPdf(loaded)
      } catch {
        if (!cancelled) setError("This guide couldn't be opened. Try downloading it instead.")
      }
    })()
    return () => {
      cancelled = true
      doc?.destroy()
    }
  }, [url])

  const pageCount = pdf?.numPages ?? 0
  const totalSpreads = twoUp ? Math.max(1, Math.ceil(pageCount / 2)) : Math.max(1, pageCount)

  // Clamp during render (rather than in an effect) so switching between 1- and
  // 2-up layouts can never leave the index out of range.
  const currentSpread = Math.min(spread, totalSpreads - 1)

  const go = useCallback(
    (delta: 1 | -1) => {
      setDir(delta)
      setSpread((s) => {
        const cur = Math.min(s, totalSpreads - 1)
        return Math.max(0, Math.min(totalSpreads - 1, cur + delta))
      })
    },
    [totalSpreads]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1)
      if (e.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go])

  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const delta = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    touchX.current = null
    if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1)
  }

  // Fit the page(s) into the measured container without overflowing.
  const layout = useMemo(() => {
    const w = size.width || 720
    const h = size.height || 600
    const gutter = twoUp ? 2 : 0
    let pageH = h
    let pageW = pageH * aspect
    if (twoUp) {
      if (pageW * 2 + gutter > w) {
        pageW = (w - gutter) / 2
        pageH = pageW / aspect
      }
    } else if (pageW > w) {
      pageW = w
      pageH = pageW / aspect
    }
    if (pageH > h) {
      pageH = h
      pageW = pageH * aspect
    }
    return { pageW: Math.floor(pageW), pageH: Math.floor(pageH), gutter }
  }, [size.width, size.height, aspect, twoUp])

  const canPrev = currentSpread > 0
  const canNext = currentSpread < totalSpreads - 1

  const pageNumbers = twoUp ? [currentSpread * 2, currentSpread * 2 + 1] : [currentSpread]

  const rangeLabel = !pageCount
    ? "—"
    : twoUp
      ? currentSpread * 2 + 1 === Math.min(currentSpread * 2 + 2, pageCount)
        ? `Page ${currentSpread * 2 + 1} of ${pageCount}`
        : `Pages ${currentSpread * 2 + 1}–${Math.min(currentSpread * 2 + 2, pageCount)} of ${pageCount}`
      : `Page ${currentSpread + 1} of ${pageCount}`

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {rangeLabel}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={!canPrev}
            onClick={() => go(-1)}
            startIcon={<KIcon icon="chevron_left" size={16} />}
          >
            Prev
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!canNext}
            onClick={() => go(1)}
            endIcon={<KIcon icon="chevron_right" size={16} />}
          >
            Next
          </Button>
          <Button
            size="small"
            variant="contained"
            component="a"
            href={url}
            download
            startIcon={<KIcon icon="download" size={16} />}
          >
            Download
          </Button>
        </Box>
      </Box>

      <Box
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        sx={{
          position: "relative",
          width: "100%",
          height: "calc(100dvh - 300px)",
          minHeight: 400,
          maxHeight: 860,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          background: color.canvasSunk,
          p: 1.5,
          overflow: "hidden",
          perspective: "2200px",
          touchAction: "pan-y",
        }}
      >
        {error ? (
          <Box sx={{ textAlign: "center", px: 3 }}>
            <KIcon icon="error" size={30} sx={{ color: "text.disabled" }} />
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
              {error}
            </Typography>
            <Button
              variant="contained"
              size="small"
              component="a"
              href={url}
              download
              sx={{ mt: 2 }}
              startIcon={<KIcon icon="download" size={16} />}
            >
              Download PDF
            </Button>
          </Box>
        ) : !pdf ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
            <CircularProgress size={26} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Opening “{title}”…
            </Typography>
          </Box>
        ) : (
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={`${currentSpread}-${twoUp ? "2" : "1"}`}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                gap: layout.gutter,
                transformStyle: "preserve-3d",
                transformOrigin: dir > 0 ? "left center" : "right center",
              }}
            >
              {pageNumbers.map((n, i) =>
                n >= 0 && n < pageCount ? (
                  <PdfPage
                    key={n}
                    pdf={pdf}
                    pageNumber={n + 1}
                    width={layout.pageW}
                    height={layout.pageH}
                  />
                ) : (
                  <BlankPage key={`blank-${i}`} width={layout.pageW} height={layout.pageH} />
                )
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </Box>
    </Box>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"

const CANVAS_W = 640
const CANVAS_H = 220

/**
 * SignaturePad — a touch/mouse signature box backed by a plain <canvas>.
 * Exposes `getSignature()` which returns a PNG data URL, or null when empty.
 * No external libs: strokes are drawn to the canvas and never scaled, so the
 * stored signature is crisp at its original resolution.
 */
export function SignaturePad({
  onSignatureChange,
}: {
  onSignatureChange?: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [, force] = useState(0)
  const dirtyRef = useRef(false)

  const ctx = () => canvasRef.current?.getContext("2d") ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color.ink[900]
  }, [])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * CANVAS_W) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_H) / rect.height,
    }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const c = ctx()
    if (!c) return
    drawing.current = true
    const p = pos(e)
    c.beginPath()
    c.moveTo(p.x, p.y)
    c.lineTo(p.x + 0.1, p.y + 0.1)
    c.stroke()
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const c = ctx()
    if (!c) return
    const p = pos(e)
    c.lineTo(p.x, p.y)
    c.stroke()
    dirtyRef.current = true
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    force((n) => n + 1)
    onSignatureChange?.(canvasRef.current?.toDataURL("image/png") ?? null)
  }

  function clear() {
    const c = ctx()
    if (!c) return
    c.fillStyle = "#FFFFFF"
    c.fillRect(0, 0, CANVAS_W, CANVAS_H)
    dirtyRef.current = false
    onSignatureChange?.(null)
    force((n) => n + 1)
  }

  return (
    <Box>
      <Box
        sx={{
          border: "1.5px solid",
          borderColor: "divider",
          borderRadius: `${radius.input}px`,
          overflow: "hidden",
          backgroundColor: "#fff",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          style={{
            display: "block",
            width: "100%",
            touchAction: "none",
            cursor: "crosshair",
          }}
        />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.disabled" }}>
          <KIcon icon="draw" size={16} />
          <Box component="span" sx={{ fontSize: 12 }}>Sign with your finger</Box>
        </Box>
        <Button size="small" color="inherit" onClick={clear} startIcon={<KIcon icon="backspace" size={16} />}>
          Clear
        </Button>
      </Box>
    </Box>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import { KIcon } from "@/components/kiz/primitives/icon"
import { scanTranslate } from "@/app/(dashboard)/[role]/ar-terjemah/actions"
import { arLanguageLabel, findArLanguage, sourceLangLabel, type ArLanguage } from "@/lib/ar-translate-meta"
import type { ArTranslateResult } from "@/lib/ar-translate"
import { color, radius } from "@/lib/theme"

interface Props {
  languages: ArLanguage[]
  suggestedLang: string | null
}

type CamStatus = "idle" | "waiting" | "on" | "off"

interface Captured {
  dataUrl: string
  base64: string
  width: number
  height: number
}

const INTRO_SEEN_KEY = "kiz-lens-intro-seen"
const LANG_KEY = "kiz-lens-lang"
const MAX_EDGE = 1280 // longest edge sent to the model — keeps latency low
const JPEG_QUALITY = 0.82

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1")
  } catch {
    /* private browsing — the intro just reappears next time */
  }
}

function readStoredLang(): string | null {
  try {
    return localStorage.getItem(LANG_KEY)
  } catch {
    return null
  }
}

function writeStoredLang(code: string) {
  try {
    localStorage.setItem(LANG_KEY, code)
  } catch {
    /* private browsing — the choice just isn't remembered */
  }
}

/** Read a translated block aloud using the browser's built-in speech synthesis. */
function speak(text: string, langTag: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langTag
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  } catch {
    /* unsupported voices — ignore */
  }
}

/** Draw a source (video or image) to a canvas, downscaled, and return JPEG bytes. */
function toCaptured(source: CanvasImageSource, srcW: number, srcH: number): Captured | null {
  if (!srcW || !srcH) return null

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH))
  const width = Math.round(srcW * scale)
  const height = Math.round(srcH * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, width, height)

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY)
  const base64 = dataUrl.split(",")[1] ?? ""
  if (!base64) return null
  return { dataUrl, base64, width, height }
}

/** Grab a still from the live video, downscaled so the AI call stays fast. */
function captureFrame(video: HTMLVideoElement): Captured | null {
  return toCaptured(video, video.videoWidth, video.videoHeight)
}

/** Load a picked image file and downscale it exactly like a camera frame. */
async function fileToCaptured(file: File): Promise<Captured | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("read failed"))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("decode failed"))
    el.src = dataUrl
  })
  return toCaptured(img, img.naturalWidth, img.naturalHeight)
}

/** Largest box of the given aspect ratio that fits inside the stage. */
function fitContain(stageW: number, stageH: number, aspect: number): { w: number; h: number } {
  if (!stageW || !stageH) return { w: 0, h: 0 }
  let w = stageW
  let h = w / aspect
  if (h > stageH) {
    h = stageH
    w = h * aspect
  }
  return { w: Math.round(w), h: Math.round(h) }
}

/**
 * KIZ Lens — point the camera at a Malay/English sign or form, tap Scan, and
 * the translation appears over the original text. Reuses the same camera
 * lifecycle as the AR Directory (intro → getUserMedia → retry on failure).
 */
export function ArTranslate({ languages, suggestedLang }: Props) {
  const [introState, setIntroState] = useState<"checking" | "show" | "hidden">("checking")
  const [camStatus, setCamStatus] = useState<CamStatus>("idle")
  const [camError, setCamError] = useState<string | null>(null)
  const [cameraRetryKey, setCameraRetryKey] = useState(0)

  const defaultLang = suggestedLang ?? languages[0]?.code ?? "zh"
  const [targetLang, setTargetLang] = useState(defaultLang)

  const [captured, setCaptured] = useState<Captured | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ArTranslateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  // The frame we last captured, so changing language can re-translate without
  // asking the resident to hold the phone still again.
  const frameRef = useRef<Captured | null>(null)

  // Track the stage box so the frozen photo can be fitted precisely — this is
  // what keeps the translated overlays aligned with the original text.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setStageSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [introState, captured])

  // Client-only: resolve whether the intro explainer has already been dismissed.
  // Deferred a tick so the camera effect below (gated on `introState === "hidden"`)
  // doesn't race the intro on first paint.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setIntroState(readFlag(INTRO_SEEN_KEY) ? "hidden" : "show")
      const stored = readStoredLang()
      if (stored && languages.some((l) => l.code === stored)) setTargetLang(stored)
    }, 0)
    return () => window.clearTimeout(id)
  }, [languages])

  // ── Camera ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (introState !== "hidden") return
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera isn't available on this device or browser.")
        setCamStatus("off")
        return
      }
      try {
        setCamStatus("waiting")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setCamStatus("on")
        setCamError(null)
      } catch {
        if (!cancelled) {
          setCamError("Camera permission was declined. Allow it in your browser settings to use KIZ Lens.")
          setCamStatus("off")
        }
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [introState, cameraRetryKey])

  // The <video> only exists while live (it unmounts when a frame is frozen), so
  // after "Scan again" the freshly mounted element needs the stream reattached —
  // the start effect above won't re-run on its own.
  useEffect(() => {
    if (camStatus === "on" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camStatus, captured])

  // Recover the feed after the tab is backgrounded and comes back.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden || camStatus !== "on") return
      const track = streamRef.current?.getVideoTracks()[0]
      if (track && track.readyState === "live") {
        videoRef.current?.play().catch(() => {})
      } else {
        setCameraRetryKey((k) => k + 1)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [camStatus])

  const runScan = useCallback(
    async (frame: Captured, lang: string) => {
      setScanning(true)
      setError(null)
      try {
        const res = await scanTranslate({ imageBase64: frame.base64, targetLang: lang, mimeType: "image/jpeg" })
        if (res.ok) {
          setResult(res.result)
        } else {
          setResult(null)
          setError(res.error)
        }
      } catch {
        setResult(null)
        setError("Something went wrong. Please try again.")
      } finally {
        setScanning(false)
      }
    },
    []
  )

  const handleScan = useCallback(() => {
    const video = videoRef.current
    if (!video || scanning) return
    const frame = captureFrame(video)
    if (!frame) {
      setError("Camera isn't ready yet — give it a moment.")
      return
    }
    frameRef.current = frame
    setCaptured(frame)
    setResult(null)
    void runScan(frame, targetLang)
  }, [scanning, targetLang, runScan])

  const chooseLang = useCallback(
    (code: string) => {
      setTargetLang(code)
      writeStoredLang(code)
      // A frame is already frozen — re-translate it in the new language.
      if (frameRef.current) {
        setResult(null)
        void runScan(frameRef.current, code)
      }
    },
    [runScan]
  )

  const resetScan = useCallback(() => {
    setCaptured(null)
    setResult(null)
    setError(null)
    frameRef.current = null
  }, [])

  // Fallback for laptops / desktops with no camera: pick a photo instead.
  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || scanning) return
      setError(null)
      try {
        const frame = await fileToCaptured(file)
        if (!frame) {
          setError("That image couldn't be read — try another.")
          return
        }
        frameRef.current = frame
        setCaptured(frame)
        setResult(null)
        void runScan(frame, targetLang)
      } catch {
        setError("That image couldn't be read — try another.")
      }
    },
    [scanning, targetLang, runScan]
  )

  if (introState === "checking") {
    return <Box sx={{ maxWidth: 720, mx: "auto", minHeight: 320 }} />
  }

  if (introState === "show") {
    return (
      <IntroCard
        onStart={() => {
          writeFlag(INTRO_SEEN_KEY)
          setIntroState("hidden")
        }}
      />
    )
  }

  const cameraOn = camStatus === "on"
  const frozen = Boolean(captured)
  const fit = captured ? fitContain(stageSize.w, stageSize.h, captured.width / captured.height) : { w: 0, h: 0 }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          e.target.value = ""
          void handleFile(file)
        }}
      />
      <Box
        sx={{
          position: { xs: "fixed", sm: "relative" },
          top: { xs: 0, sm: "auto" },
          left: { xs: 0, sm: "auto" },
          right: { xs: 0, sm: "auto" },
          bottom: { xs: 0, sm: "auto" },
          zIndex: { xs: 1150, sm: "auto" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: { xs: 0, sm: `${radius.cardLg}px` },
          border: { xs: "none", sm: "1px solid" },
          borderColor: "divider",
          height: { xs: "100dvh", sm: 620 },
          backgroundColor: color.ink[900],
          "@keyframes kizScanline": {
            "0%": { top: "0%", opacity: 0 },
            "12%": { opacity: 1 },
            "88%": { opacity: 1 },
            "100%": { top: "100%", opacity: 0 },
          },
        }}
      >
        {/* Stage */}
        <Box ref={stageRef} sx={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {frozen ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Fitted to the stage so overlay boxes line up with the photo */}
              <Box
                sx={{
                  position: "relative",
                  width: fit.w || "100%",
                  height: fit.h || "100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={captured!.dataUrl}
                  alt="Scanned frame"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
                />

                {/* In-place translated overlays */}
                {result?.blocks.map((block, i) => {
                  if (!block.box) return null
                  const fontSize = Math.max(10, Math.min(26, block.box.h * fit.h * 0.62))
                  return (
                    <Box
                      key={i}
                      sx={{
                        position: "absolute",
                        left: `${block.box.x * 100}%`,
                        top: `${block.box.y * 100}%`,
                        width: `${block.box.w * 100}%`,
                        height: `${block.box.h * 100}%`,
                        p: "2px 4px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(8,145,178,0.86)",
                        border: "1px solid rgba(255,255,255,0.55)",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.35)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#fff",
                          fontSize,
                          lineHeight: 1.12,
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {block.translation}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}

          {/* Viewfinder frame */}
          {!frozen && cameraOn && (
            <Box
              sx={{
                position: "absolute",
                inset: { xs: "14% 8% 22% 8%", sm: "12% 10% 20% 10%" },
                pointerEvents: "none",
                borderRadius: "14px",
                border: "1.5px solid rgba(255,255,255,0.5)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.28)",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${color.brand[300]}, transparent)`,
                  animation: "kizScanline 2.6s ease-in-out infinite",
                }}
              />
            </Box>
          )}

          {/* Scanning shimmer */}
          {scanning && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                backgroundColor: "rgba(0,0,0,0.42)",
                backdropFilter: "blur(2px)",
              }}
            >
              <CircularProgress size={34} sx={{ color: color.brand[300] }} />
              <Typography sx={{ color: "#fff", fontSize: 13.5, fontWeight: 600 }}>
                Reading & translating…
              </Typography>
            </Box>
          )}

          {/* Top bar */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              pt: "calc(env(safe-area-inset-top) + 12px)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: `${radius.pill}px`,
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#fff",
              }}
            >
              <KIcon icon="translate" size={18} color={color.brand[300]} />
              <Typography sx={{ fontSize: 14, fontWeight: 650, letterSpacing: "-0.01em" }}>KIZ Lens</Typography>
            </Box>

            {frozen && (
              <Box
                component="button"
                type="button"
                onClick={resetScan}
                sx={{
                  ml: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: `${radius.pill}px`,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <KIcon icon="photo_camera" size={16} />
                Scan again
              </Box>
            )}
          </Box>

          {/* No-text / error toast */}
          {!scanning && frozen && error && (
            <Box
              sx={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                px: 1.75,
                py: 1.25,
                borderRadius: `${radius.card}px`,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#fff",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {error}
            </Box>
          )}
          {!scanning && frozen && !error && result && result.blocks.length === 0 && (
            <Box
              sx={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                px: 1.75,
                py: 1.25,
                borderRadius: `${radius.card}px`,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#fff",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              No readable text found — get closer and hold steady.
            </Box>
          )}

          {/* Camera off / error */}
          {!frozen && !cameraOn && camStatus !== "waiting" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                px: 4,
                textAlign: "center",
                color: "#fff",
              }}
            >
              <KIcon icon="no_photography" size={40} color="rgba(255,255,255,0.7)" />
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>KIZ Lens needs your camera</Typography>
              <Typography sx={{ fontSize: 13.5, opacity: 0.8, maxWidth: 360, lineHeight: 1.5 }}>
                {camError ?? "Allow camera access to translate signboards and forms. Everything is read on demand — nothing is recorded."}
              </Typography>
              <Button
                variant="contained"
                onClick={() => setCameraRetryKey((k) => k + 1)}
                sx={{ borderRadius: `${radius.pill}px`, textTransform: "none" }}
              >
                Try camera again
              </Button>
              <Button
                variant="text"
                onClick={() => fileRef.current?.click()}
                startIcon={<KIcon icon="upload" size={18} />}
                sx={{ borderRadius: `${radius.pill}px`, textTransform: "none", color: "#fff" }}
              >
                Upload a photo instead
              </Button>
            </Box>
          )}
        </Box>

        {/* Detected text list — the reliable, always-readable fallback. Lives
            inside the stage wrapper so it stays visible on the full-screen
            mobile viewport as well as the desktop card. */}
        {frozen && result && result.blocks.length > 0 && !scanning && (
          <Box
            sx={{
              flexShrink: 0,
              maxHeight: "42%",
              overflowY: "auto",
              backgroundColor: "background.paper",
              borderTop: "1px solid",
              borderColor: "divider",
              px: 2,
              py: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.secondary" }}>
                DETECTED TEXT · {result.blocks.length}
              </Typography>
              {sourceLangLabel(result.sourceLang) && (
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: `${radius.pill}px`,
                    backgroundColor: color.brand[50],
                    color: color.brand[700],
                    fontSize: 11,
                    fontWeight: 650,
                  }}
                >
                  <KIcon icon="auto_awesome" size={13} />
                  {sourceLangLabel(result.sourceLang)}
                </Box>
              )}
            </Box>
            {result.blocks.map((block, i) => (
              <Box
                key={i}
                sx={{
                  py: 1.25,
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.3 }}>
                  {block.text}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 600, mt: 0.25, lineHeight: 1.35 }}>
                    {block.translation}
                  </Typography>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => speak(block.translation, findArLanguage(targetLang)?.tts ?? "en")}
                    aria-label="Listen to translation"
                    sx={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "transparent",
                      color: "text.secondary",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: color.brand[50], color: color.brand[700] },
                    }}
                  >
                    <KIcon icon="volume_up" size={16} />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* Bottom control deck */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            flexShrink: 0,
            pb: "calc(env(safe-area-inset-bottom) + 12px)",
            backgroundColor: "background.paper",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {/* Language chips */}
          <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", px: 1.5, py: 1.25, scrollbarWidth: "none" }}>
            {languages.map((l) => {
              const active = l.code === targetLang
              return (
                <Box
                  key={l.code}
                  component="button"
                  type="button"
                  onClick={() => chooseLang(l.code)}
                  sx={{
                    flexShrink: 0,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: `${radius.pill}px`,
                    border: "1px solid",
                    borderColor: active ? color.brand[600] : "divider",
                    backgroundColor: active ? color.brand[50] : "transparent",
                    color: active ? color.brand[700] : "text.secondary",
                    fontSize: 13,
                    fontWeight: active ? 650 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {l.native}
                </Box>
              )
            })}
          </Box>

          {/* Scan button */}
          <Box sx={{ px: 1.5, pb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 600 }}>
                Translating to
              </Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 650, letterSpacing: "-0.01em" }} noWrap>
                {arLanguageLabel(targetLang)}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              aria-label="Upload a photo instead"
              sx={{
                minWidth: 0,
                px: 1.5,
                py: 1.1,
                flexShrink: 0,
                borderRadius: `${radius.pill}px`,
              }}
            >
              <KIcon icon="upload" size={19} />
            </Button>
            <Button
              variant="contained"
              onClick={handleScan}
              disabled={!cameraOn || scanning}
              startIcon={<KIcon icon={frozen ? "refresh" : "document_scanner"} size={19} />}
              sx={{
                borderRadius: `${radius.pill}px`,
                textTransform: "none",
                fontWeight: 700,
                px: 2.5,
                py: 1.1,
                flexShrink: 0,
              }}
            >
              {frozen ? "Re-scan" : "Scan"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

function IntroCard({ onStart }: { onStart: () => void }) {
  const points = [
    { icon: "photo_camera", text: "Camera, so it can read the sign or form in front of you" },
    { icon: "translate", text: "AI, which translates the text into your language in a second" },
    { icon: "shield", text: "The photo is used only for that one translation — never stored" },
  ]
  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 4 }, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 2 }}>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: `${radius.card}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, rgba(8,145,178,0.14), rgba(34,211,238,0.10))",
            color: color.brand[700],
          }}
        >
          <KIcon icon="translate" size={30} />
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" }}>KIZ Lens</Typography>
        <Typography sx={{ fontSize: 14.5, color: "text.secondary", maxWidth: 460, lineHeight: 1.5 }}>
          Point your camera at any Malay or English signboard, notice or form, tap Scan, and read it
          instantly in your own language — right on top of the original text.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", maxWidth: 420, mt: 0.5 }}>
          {points.map((p) => (
            <Box key={p.icon} sx={{ display: "flex", alignItems: "center", gap: 1.25, textAlign: "left" }}>
              <KIcon icon={p.icon} size={18} color={color.brand[600]} />
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>{p.text}</Typography>
            </Box>
          ))}
        </Box>
        <Button
          variant="contained"
          onClick={onStart}
          sx={{ mt: 1, borderRadius: `${radius.pill}px`, textTransform: "none", fontWeight: 700, px: 3, py: 1.1 }}
        >
          Open the camera
        </Button>
      </Box>
    </Box>
  )
}

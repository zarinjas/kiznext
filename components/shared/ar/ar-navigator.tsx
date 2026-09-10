"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { TYPE_TONES } from "@/lib/direktori-meta"
import { bearingDeg, haversineMeters, headingDelta, formatDistanceMeters } from "@/lib/geo"
import { color, font, radius } from "@/lib/theme"
import type { DestinationType } from "@/app/generated/prisma/client"

interface Destination {
  id: string
  name: string
  type: DestinationType
  icon: string
  latitude: number
  longitude: number
  indoor: boolean
  building: string | null
}

interface Props {
  destinations: Destination[]
}

type SensorStatus = "idle" | "waiting" | "on" | "off"

interface Position {
  lat: number
  lng: number
  accuracy: number | null
}

function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function isCompassEvent(e: DeviceOrientationEvent): number | null {
  const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number }
  if (typeof ev.webkitCompassHeading === "number") return (ev.webkitCompassHeading + 360) % 360
  // Android `deviceorientationabsolute`: alpha 0 = device top points north,
  // increases clockwise. Only trust it when the event is north-referenced.
  if (e.absolute === true && typeof e.alpha === "number") return (e.alpha + 360) % 360
  return null
}

export function ArNavigator({ destinations }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(destinations[0]?.id ?? null)
  const [position, setPosition] = useState<Position | null>(null)
  const [camStatus, setCamStatus] = useState<SensorStatus>("idle")
  const [camError, setCamError] = useState<string | null>(null)
  const [compass, setCompass] = useState<SensorStatus>("idle")
  const compassReady = compass === "on"

  const videoRef = useRef<HTMLVideoElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const pinOuterRef = useRef<HTMLDivElement>(null)
  const pinBodyRef = useRef<HTMLDivElement>(null)
  const glyphRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const headingRef = useRef<number>(0)
  const smoothRef = useRef<number>(0)
  const seededRef = useRef(false)
  const targetRef = useRef<Destination | null>(destinations.find((d) => d.id === selectedId) ?? null)
  const positionRef = useRef<Position | null>(null)
  const rafRef = useRef<number>(0)

  const selected = destinations.find((d) => d.id === selectedId) ?? null

  const cameraOn = camStatus === "on"
  const showAr = cameraOn && compassReady && Boolean(selected)

  // ── Camera ────────────────────────────────────────────────────────────────
  useEffect(() => {
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
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
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
        setCamStatus("on")      } catch {
        if (!cancelled) {
          setCamError("Camera permission was declined — use the list below instead.")
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
  }, [])

  // Once the stream is ready AND the AR view has mounted its <video>, attach
  // the stream (the video element only exists in AR mode).
  useEffect(() => {
    if (camStatus === "on" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camStatus, showAr])

  // ── Compass / orientation ─────────────────────────────────────────────────
  // First heading that's north-referenced flips the compass to "on" (React
  // bails out on the same string, so the per-event call is cheap).
  useEffect(() => {
    function onOrientation(e: DeviceOrientationEvent) {
      const h = isCompassEvent(e)
      if (h != null) {
        if (!seededRef.current) {
          seededRef.current = true
          smoothRef.current = h
        }
        headingRef.current = h
        setCompass("on")
      }
    }
    window.addEventListener("deviceorientation", onOrientation, true)
    return () => window.removeEventListener("deviceorientation", onOrientation, true)
  }, [])

  useEffect(() => {
    function onAbsolute(e: DeviceOrientationEvent) {
      const h = isCompassEvent(e)
      if (h != null) {
        if (!seededRef.current) {
          seededRef.current = true
          smoothRef.current = h
        }
        headingRef.current = h
        setCompass("on")
      }
    }
    window.addEventListener("deviceorientationabsolute", onAbsolute, true)
    return () => window.removeEventListener("deviceorientationabsolute", onAbsolute, true)
  }, [])

  const requestCompass = useCallback(async () => {
    const DE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof DE.requestPermission !== "function") {
      // Android fires deviceorientationabsolute without a prompt.
      setCompass("on")
      return
    }
    setCompass("waiting")
    try {
      const state = await DE.requestPermission()
      if (state === "granted") {
        setCompass("on")
      } else {
        setCompass("off")
      }
    } catch {
      setCompass("off")
    }
  }, [])

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return
    const onPos = (p: GeolocationPosition) => {
      const next: Position = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy ?? null,
      }
      positionRef.current = next
      setPosition(next)
    }
    const onErr = () => {
      /* leave position null → "locating" handled in UI */
    }
    navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    })
  }, [])

  // Keep destination target ref current so the rAF loop can read it cheaply.
  useEffect(() => {
    targetRef.current = destinations.find((d) => d.id === selectedId) ?? null
  }, [selectedId, destinations])

  // ── Arrow loop (no React re-render per frame) ─────────────────────────────
  // A Google-Street-View-style "standing marker": the arrow is projected to the
  // horizontal screen position of its bearing (a pinhole guess over the camera
  // FOV), slides as you turn, and grows + drops toward the bottom as you get
  // closer — implying it stands on the ground ahead of you. It is NOT a true
  // world-anchored 3D pin (that needs camera pose tracking, which a compass
  // alone cannot give), but it reads far more like AR than a fixed centre arrow.
  useEffect(() => {
    const HALF_FOV = 34 // deg; typical rear-camera horizontal FOV assumption
    const ARRIVE_M = 500 // distance at which the pin stops growing
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

    function tick() {
      const outer = pinOuterRef.current
      const body = pinBodyRef.current
      const glyph = glyphRef.current
      const view = viewRef.current
      if (!outer || !body || !glyph || !view) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const heading = headingRef.current
      // Wrap-aware low-pass so the pin glides instead of shaking to the
      // compass's ±few-degree noise.
      let diff = heading - smoothRef.current
      while (diff > 180) diff -= 360
      while (diff < -180) diff += 360
      smoothRef.current = (((smoothRef.current + diff * 0.08) % 360) + 360) % 360

      const target = targetRef.current
      const pos = positionRef.current
      const rect = view.getBoundingClientRect()
      const w = rect.width || 1
      const h = rect.height || 1

      if (!target || !pos) {
        outer.style.opacity = "0"
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const meters = haversineMeters(
        { latitude: pos.lat, longitude: pos.lng },
        { latitude: target.latitude, longitude: target.longitude },
      )
      const bearing = bearingDeg(
        { latitude: pos.lat, longitude: pos.lng },
        { latitude: target.latitude, longitude: target.longitude },
      )
      const turn = headingDelta(bearing, smoothRef.current) // + = to the right

      // Project bearing onto the screen width via the FOV, then clamp to the
      // edges so the pin never leaves the viewfinder.
      const rad = (turn * Math.PI) / 180
      let xRatio = Math.tan(rad) / Math.tan((HALF_FOV * Math.PI) / 180)
      xRatio = clamp(xRatio, -1.35, 1.35)
      const x = clamp(w / 2 + xRatio * (w * 0.42), 60, w - 60)

      // Depth cue: closer → pin sits lower on screen and is bigger, like a
      // marker standing on the ground ahead of you.
      const closeness = clamp(1 - meters / ARRIVE_M, 0, 1)
      const y = h * (0.8 - 0.34 * closeness)
      const scale = 0.7 + 0.6 * closeness
      const lean = clamp(turn * 0.3, -24, 24) // arrowhead tips toward the target
      const fade = clamp(1.1 - Math.abs(turn) / 160, 0.3, 1)

      outer.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
      outer.style.opacity = fade.toFixed(2)
      body.style.transform = `scale(${scale.toFixed(3)})`
      glyph.style.transform = `rotate(${lean.toFixed(1)}deg)`

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const live = useMemo(() => {
    if (!selected || !position) return null
    const meters = haversineMeters(
      { latitude: position.lat, longitude: position.lng },
      { latitude: selected.latitude, longitude: selected.longitude },
    )
    return { meters, label: formatDistanceMeters(meters) }
  }, [selected, position])

  if (destinations.length === 0) {    return (
      <KEmpty
        icon="view_in_ar"
        title="Nothing to navigate to yet"
        body="The AR Directory has no destinations right now — check back soon."
      />
    )
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* Destination chips */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 1,
          mb: 2,
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {destinations.map((d) => {
          const active = d.id === selectedId
          return (
            <Box
              key={d.id}
              component="button"
              type="button"
              onClick={() => setSelectedId(d.id)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.625,
                flexShrink: 0,
                px: 1.25,
                py: 0.625,
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? color.brand[500] : "divider",
                backgroundColor: active ? color.brand[50] : "background.paper",
                color: active ? color.brand[800] : "text.secondary",
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <KIcon icon={d.icon} size={16} />
              {d.name}
              {d.indoor && <KIcon icon="meeting_room" size={13} sx={{ opacity: 0.6 }} />}
            </Box>
          )
        })}
      </Box>

      {showAr ? (
        <Box
          ref={viewRef}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: `${radius.cardLg}px`,
            border: "1px solid",
            borderColor: "divider",
            height: { xs: "62dvh", sm: 560 },
            backgroundColor: color.ink[900],
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Top destination tag */}
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 0.875,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "-0.011em",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              }}
            >
              <KIcon icon={selected!.icon} size={17} sx={{ color: color.brand[300] }} />
              {selected!.name}
              {selected!.indoor && selected!.building && (
                <Box component="span" sx={{ fontSize: 12, fontWeight: 450, opacity: 0.75 }}>
                  · {selected!.building}
                </Box>
              )}
            </Box>
          </Box>

          {/* World-locked style marker (moves/scales per frame in the rAF loop) */}
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            {!position && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.625,
                    borderRadius: 999,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 500,
                  }}
                >
                  Locating you…
                </Box>
              </Box>
            )}

            {/* Standing pin — bottom-centre anchored to the projected ground point. */}
            <Box
              ref={pinOuterRef}
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 0,
                willChange: "transform",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Box
                ref={pinBodyRef}
                sx={{ display: "flex", flexDirection: "column", alignItems: "center", willChange: "transform" }}
              >
                <Box ref={glyphRef} sx={{ willChange: "transform" }}>
                  <KIcon
                    icon="navigation"
                    size={46}
                    filled
                    color="#fff"
                    sx={{
                      filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(255,255,255,0.25))",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    mt: 0.5,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 999,
                    backgroundColor: "rgba(0,0,0,0.62)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    color: "#fff",
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: font.mono,
                    whiteSpace: "nowrap",
                  }}
                >
                  {live?.label ?? "—"}
                  {live && live.meters < 30 && (
                    <Box component="span" sx={{ color: "rgba(255,255,255,0.7)", fontFamily: font.body, fontWeight: 450, marginLeft: 0.5 }}>
                      · here
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Ground shadow — makes the pin read as standing on the floor ahead. */}
              <Box
                sx={{
                  mt: 0.75,
                  width: 58,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.45)",
                  filter: "blur(3px)",
                  flexShrink: 0,
                }}
              />
            </Box>
          </Box>

          {/* Bottom hint */}
          <Box
            sx={{
              position: "absolute",
              bottom: 14,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              px: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.625,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.55)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <KIcon icon="screen_rotation" size={15} />
              Turn until the marker lines up with where you&apos;re heading
            </Box>
          </Box>
        </Box>
      ) : (
        /* Fallback — desktop, no camera, or no compass yet */
        <Box
          sx={{
            borderRadius: `${radius.cardLg}px`,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.75,
              p: { xs: 2, sm: 2.5 },
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: color.brand[50],
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: color.brand[100],
                color: color.brand[800],
              }}
            >
              <KIcon icon="directions" size={24} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 640, letterSpacing: "-0.02em" }}>Camera compass</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {camStatus === "on" && !compassReady
                  ? compass === "waiting"
                    ? "Waiting for permission…"
                    : compass === "off"
                      ? "Motion & orientation are off — the arrow needs them."
                      : "Enable your motion sensors to unlock the camera arrow."
                  : camStatus !== "on"
                    ? (camError ?? "Point-to-navigate needs a phone camera. On desktop, use the directions link instead.")
                    : "Open this on your phone for the live camera arrow."}
              </Typography>
            </Box>
          </Box>

          {camStatus === "on" && !compassReady && (
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Button
                variant="contained"
                onClick={() => void requestCompass()}
                disabled={compass === "waiting"}
                startIcon={<KIcon icon="explore" size={17} />}
              >
                {compass === "waiting" ? "Asking…" : "Enable compass"}
              </Button>
            </Box>
          )}

          <ListGroup>
            {destinations.map((d) => {
              const dist = position
                ? haversineMeters(
                    { latitude: position.lat, longitude: position.lng },
                    { latitude: d.latitude, longitude: d.longitude },
                  )
                : null
              const tone = TYPE_TONES[d.type]
              return (
                <ListRow
                  key={d.id}
                  icon={d.icon}
                  title={d.name}
                  subtitle={
                    <Box component="span">
                      {d.indoor && d.building ? `${d.building} · ` : ""}
                      {dist != null ? formatDistanceMeters(dist) : "tap for directions"}
                    </Box>
                  }
                  trailing={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                          px: 1,
                          py: 0.375,
                          borderRadius: 999,
                          backgroundColor: tone.soft,
                          color: tone.ink,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {d.indoor ? "Indoor" : "Outdoor"}
                      </Box>
                    </Box>
                  }
                  onClick={() => setSelectedId(d.id)}
                  chevron
                />
              )
            })}
          </ListGroup>

          {selected && (
            <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end" }}>
              <Button
                component="a"
                href={mapsDirectionsUrl(selected.latitude, selected.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<KIcon icon="directions" size={17} />}
              >
                Directions to {selected.name}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

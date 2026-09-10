"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Drawer from "@mui/material/Drawer"
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

/**
 * AR overlay colours are the one deliberate exception to the token rule: they
 * must stay legible over *arbitrary* live camera footage, not the white surface
 * palette, so they use recognisable navigation hues (Google Maps blue, etc).
 */
const NAV_BLUE = "#1A73E8" // Google Maps navigation arrow blue
const ARRIVE_M = 15 // metres at which we consider the user "arrived"

function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function turnHint(turn: number): string {
  const a = Math.abs(turn)
  if (a < 12) return "Straight ahead"
  if (a < 45) return turn > 0 ? "Slightly right" : "Slightly left"
  if (a < 135) return turn > 0 ? "Turn right" : "Turn left"
  return "Turn around"
}

function walkMins(meters: number): string {
  const mins = Math.round(meters / 83) // ~5 km/h walking pace
  if (mins < 1) return "<1 min walk"
  return `~${mins} min walk`
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
  const [hint, setHint] = useState("Straight ahead")
  const [arView, setArView] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const compassReady = compass === "on"

  const videoRef = useRef<HTMLVideoElement>(null)
  const scaleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const headingRef = useRef<number>(0)
  const smoothRef = useRef<number>(0)
  const seededRef = useRef(false)
  const targetRef = useRef<Destination | null>(destinations.find((d) => d.id === selectedId) ?? null)
  const positionRef = useRef<Position | null>(null)
  const hintRef = useRef("Straight ahead")
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
        setCamStatus("on")
      } catch {
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
  // A Google-Live-View-style marker: a large ground-anchored chevron arrow
  // (three blue-outlined white chevrons) rotates to point at the destination
  // bearing and grows as you get closer. All per-frame transforms go through
  // refs, so React never re-renders.
  useEffect(() => {
    const ARRIVE_SCALE_M = 500
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

    function tick() {
      const scale = scaleRef.current
      const arrow = arrowRef.current
      if (!scale || !arrow) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const heading = headingRef.current
      // Wrap-aware low-pass so the arrow glides instead of shaking to the
      // compass's ±few-degree noise.
      let diff = heading - smoothRef.current
      while (diff > 180) diff -= 360
      while (diff < -180) diff += 360
      smoothRef.current = (((smoothRef.current + diff * 0.08) % 360) + 360) % 360

      const target = targetRef.current
      const pos = positionRef.current

      if (!target || !pos) {
        scale.style.opacity = "0"
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

      // Depth cue: closer → the marker grows upward from its ground point.
      const closeness = clamp(1 - meters / ARRIVE_SCALE_M, 0, 1)
      const s = 0.85 + 0.35 * closeness

      arrow.style.transform = `rotate(${turn.toFixed(1)}deg)`
      scale.style.transform = `scale(${s.toFixed(3)})`
      scale.style.opacity = "1"

      const nextHint = turnHint(turn)
      if (nextHint !== hintRef.current) {
        hintRef.current = nextHint
        setHint(nextHint)
      }

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
    return { meters, label: formatDistanceMeters(meters), arrived: meters < ARRIVE_M }
  }, [selected, position])

  const arrived = live?.arrived ?? false

  // Haptic confirmation the moment we cross into "arrived".
  const prevArrivedRef = useRef(false)
  useEffect(() => {
    if (arrived && !prevArrivedRef.current && typeof navigator.vibrate === "function") {
      navigator.vibrate([60, 40, 60])
    }
    prevArrivedRef.current = arrived
  }, [arrived])

  let statusMessage: string
  if (camStatus === "on" && !compassReady) {
    statusMessage =
      compass === "waiting"
        ? "Waiting for permission…"
        : compass === "off"
          ? "Motion & orientation are off — the arrow needs them."
          : "Enable your motion sensors to unlock the camera arrow."
  } else if (camStatus !== "on") {
    statusMessage =
      camError ??
      "Point-to-navigate needs a phone camera. On desktop, use the directions link instead."
  } else {
    statusMessage = "Open this on your phone for the live camera arrow."
  }

  if (destinations.length === 0) {
    return (
      <KEmpty
        icon="view_in_ar"
        title="Nothing to navigate to yet"
        body="The AR Directory has no destinations right now — check back soon."
      />
    )
  }

  const choose = (id: string) => {
    setSelectedId(id)
    setPickerOpen(false)
  }

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {showAr && arView ? (
        <Box
          sx={{
            position: { xs: "fixed", sm: "relative" },
            top: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            right: { xs: 0, sm: "auto" },
            bottom: { xs: 0, sm: "auto" },
            zIndex: { xs: 1150, sm: "auto" },
            overflow: "hidden",
            borderRadius: { xs: 0, sm: `${radius.cardLg}px` },
            border: { xs: "none", sm: "1px solid" },
            borderColor: "divider",
            height: { xs: "100dvh", sm: 560 },
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

          {/* Top bar: exit + destination picker */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              px: 1.5,
              pt: "calc(env(safe-area-inset-top) + 12px)",
            }}
          >
            <Box
              component="button"
              type="button"
              aria-label="Exit camera view"
              onClick={() => setArView(false)}
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#fff",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <KIcon icon="close" size={20} />
            </Box>

            <Box
              component="button"
              type="button"
              onClick={() => setPickerOpen(true)}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.5,
                py: 1,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#fff",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              }}
            >
              <KIcon icon={selected!.icon} size={18} sx={{ color: color.brand[300], flexShrink: 0 }} />
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.011em",
                }}
              >
                {selected!.name}
                {selected!.indoor && selected!.building && (
                  <Box component="span" sx={{ fontSize: 12, fontWeight: 450, opacity: 0.7 }}>
                    {" "}
                    · {selected!.building}
                  </Box>
                )}
              </Box>
              <KIcon icon="expand_more" size={18} sx={{ opacity: 0.7, flexShrink: 0 }} />
            </Box>
          </Box>

          {/* Ground-anchored Live View arrow + distance */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            {!position && (
              <Box
                sx={{
                  position: "absolute",
                  top: "16%",
                  left: "50%",
                  transform: "translateX(-50%)",
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
            )}

            <Box
              sx={{
                position: "absolute",
                left: "50%",
                bottom: "20%",
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Box
                ref={scaleRef}
                sx={{
                  transformOrigin: "50% 100%",
                  willChange: "transform",
                  opacity: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  ref={arrowRef}
                  sx={{
                    transformOrigin: "50% 100%",
                    willChange: "transform",
                    display: "flex",
                  }}
                >
                  <svg
                    width="150"
                    height="180"
                    viewBox="0 0 120 150"
                    fill="none"
                    style={{ overflow: "visible", display: "block" }}
                  >
                    <defs>
                      <filter id="kiz-nav-glow" x="-60%" y="-60%" width="220%" height="220%">
                        <feDropShadow dx="0" dy="7" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
                      </filter>
                    </defs>
                    <g filter="url(#kiz-nav-glow)" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 140 L60 102 L98 140" stroke={arrived ? color.success.main : NAV_BLUE} strokeWidth="16" />
                      <path d="M22 104 L60 66 L98 104" stroke={arrived ? color.success.main : NAV_BLUE} strokeWidth="16" />
                      <path d="M22 68 L60 30 L98 68" stroke={arrived ? color.success.main : NAV_BLUE} strokeWidth="16" />
                      <path d="M22 140 L60 102 L98 140" stroke="#FFFFFF" strokeWidth="8" />
                      <path d="M22 104 L60 66 L98 104" stroke="#FFFFFF" strokeWidth="8" />
                      <path d="M22 68 L60 30 L98 68" stroke="#FFFFFF" strokeWidth="8" />
                    </g>
                  </svg>
                </Box>

                {/* Ground shadow — anchors the arrow to the floor ahead. */}
                <Box
                  sx={{
                    width: 92,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.38)",
                    filter: "blur(4px)",
                    mt: -1,
                  }}
                />
              </Box>

              <Box
                sx={{
                  mt: 1.25,
                  px: 1.75,
                  py: 0.625,
                  borderRadius: 999,
                  backgroundColor: "rgba(0,0,0,0.62)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 650,
                  fontFamily: font.mono,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {live?.label ?? "—"}
                {live && (
                  <Box
                    component="span"
                    sx={{
                      color: "rgba(255,255,255,0.72)",
                      fontFamily: font.body,
                      fontWeight: 500,
                      marginLeft: 0.625,
                    }}
                  >
                    · {arrived ? "arrived" : walkMins(live.meters)}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>

          {/* Bottom hint */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              px: 2,
              pb: "calc(env(safe-area-inset-bottom) + 18px)",
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
                color: "rgba(255,255,255,0.9)",
                fontSize: 12.5,
                fontWeight: 550,
              }}
            >
              <KIcon icon={arrived ? "celebration" : "near_me"} size={15} />
              {arrived ? "You've arrived" : hint}
            </Box>
          </Box>
        </Box>
      ) : (
        /* Fallback — desktop, no camera, no compass, or user exited the view */
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
                {statusMessage}
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

          {cameraOn && compassReady && !arView && (
            <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
              <Button
                variant="contained"
                onClick={() => setArView(true)}
                startIcon={<KIcon icon="view_in_ar" size={17} />}
              >
                Open camera view
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
              const active = d.id === selectedId
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
                      {active && <KIcon icon="check_circle" size={18} filled sx={{ color: color.brand[600] }} />}
                    </Box>
                  }
                  onClick={() => setSelectedId(d.id)}
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

      {/* Destination picker — bottom sheet */}
      <Drawer
        anchor="bottom"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: `${radius.sheet}px`,
              borderTopRightRadius: `${radius.sheet}px`,
              maxHeight: "86dvh",
              pb: "calc(env(safe-area-inset-bottom) + 8px)",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1.25, pb: 0.5 }}>
          <Box sx={{ width: 40, height: 5, borderRadius: 999, backgroundColor: "divider" }} />
        </Box>
        <Box sx={{ px: 2, pb: 1.5 }}>
          <Typography variant="h3" sx={{ mb: 1.25, px: 0.5 }}>
            Choose a destination
          </Typography>
          <ListGroup>
            {destinations.map((d) => {
              const dist = position
                ? haversineMeters(
                    { latitude: position.lat, longitude: position.lng },
                    { latitude: d.latitude, longitude: d.longitude },
                  )
                : null
              const tone = TYPE_TONES[d.type]
              const active = d.id === selectedId
              return (
                <ListRow
                  key={d.id}
                  icon={d.icon}
                  title={d.name}
                  subtitle={
                    <Box component="span">
                      {d.indoor && d.building ? `${d.building} · ` : ""}
                      {dist != null ? formatDistanceMeters(dist) : "distance unknown"}
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
                      {active && <KIcon icon="check_circle" size={18} filled sx={{ color: color.brand[600] }} />}
                    </Box>
                  }
                  onClick={() => choose(d.id)}
                />
              )
            })}
          </ListGroup>
        </Box>
      </Drawer>
    </Box>
  )
}

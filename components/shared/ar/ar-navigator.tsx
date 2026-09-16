"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Drawer from "@mui/material/Drawer"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { ArMiniMap } from "@/components/shared/ar/ar-minimap"
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

const INTRO_SEEN_KEY = "kiz-ar-intro-seen"
const ARROW_COACH_SEEN_KEY = "kiz-ar-arrow-coach-seen"
const LOW_ACCURACY_M = 20 // GPS accuracy worse than this gets an "approximate" caveat
const LOCATING_SLOW_MS = 15000 // how long "Locating you…" waits before offering an escape hatch

type DestGroup = "block" | "facility" | "other"

function destinationGroup(type: DestinationType): DestGroup {
  if (type === "block") return "block"
  if (type === "facility") return "facility"
  return "other"
}

function readLocalFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function writeLocalFlag(key: string) {
  try {
    localStorage.setItem(key, "1")
  } catch {
    /* private browsing / storage disabled — the hint just reappears next time */
  }
}

/** One-time explainer shown before the very first camera/location/motion
 * permission prompt, so a bare native dialog isn't the user's first signal
 * about what this feature needs and why. */
function ArIntroCard({ onStart }: { onStart: () => void }) {
  const needs = [
    { icon: "photo_camera", text: "Camera, so we can overlay the arrow on what you see" },
    { icon: "my_location", text: "Location, so we can work out distance and direction" },
    { icon: "explore", text: "Motion and orientation, so we know which way you're facing" },
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
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.brand[100],
            color: color.brand[800],
          }}
        >
          <KIcon icon="view_in_ar" size={30} />
        </Box>
        <Typography variant="h3">Find your way around KIZ</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
          Pick a destination and a live camera arrow will point straight at it. Here is what this
          needs first.
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, width: "100%", maxWidth: 360, textAlign: "left" }}>
          {needs.map((item) => (
            <Box key={item.icon} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <KIcon icon={item.icon} size={18} sx={{ color: color.brand[600], flexShrink: 0 }} />
              <Typography variant="body2">{item.text}</Typography>
            </Box>
          ))}
        </Box>
        <Button
          variant="contained"
          size="large"
          onClick={onStart}
          startIcon={<KIcon icon="arrow_forward" size={18} />}
          sx={{ mt: 1 }}
        >
          Get Started
        </Button>
      </Box>
    </Box>
  )
}

/** Filter-by-kind chips + a nearest-first sort toggle, shared by the fallback
 * list and the bottom-sheet picker now that the directory has grown from 7
 * to 20 pins and a flat list stopped being scannable. */
function ArFilterChips({
  typeFilter,
  onTypeFilter,
  sortNearest,
  onToggleSort,
  positionAvailable,
}: {
  typeFilter: "all" | DestGroup
  onTypeFilter: (v: "all" | DestGroup) => void
  sortNearest: boolean
  onToggleSort: () => void
  positionAvailable: boolean
}) {
  const options: { value: "all" | DestGroup; label: string }[] = [
    { value: "all", label: "All" },
    { value: "block", label: "Dorms" },
    { value: "facility", label: "Facilities" },
    { value: "other", label: "Places" },
  ]
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5, overflowX: "auto", pb: 0.5 }}>
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          size="small"
          onClick={() => onTypeFilter(opt.value)}
          color={typeFilter === opt.value ? "primary" : "default"}
          variant={typeFilter === opt.value ? "filled" : "outlined"}
          sx={{ flexShrink: 0 }}
        />
      ))}
      <Chip
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <KIcon icon="near_me" size={14} />
            Nearest first
          </Box>
        }
        size="small"
        onClick={onToggleSort}
        color={sortNearest ? "primary" : "default"}
        variant={sortNearest ? "filled" : "outlined"}
        disabled={!positionAvailable}
        sx={{ flexShrink: 0, ml: "auto" }}
      />
    </Box>
  )
}

export function ArNavigator({ destinations }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(destinations[0]?.id ?? null)
  const [position, setPosition] = useState<Position | null>(null)
  const [camStatus, setCamStatus] = useState<SensorStatus>("idle")
  const [camError, setCamError] = useState<string | null>(null)
  const [compass, setCompass] = useState<SensorStatus>("idle")
  const [hint, setHint] = useState("Straight ahead")
  const [headingDisplay, setHeadingDisplay] = useState(0)
  // Starts on the destination list, not the camera — a student should choose
  // a place and a method (AR or Google Maps) before the camera opens, not
  // get dropped straight into AR the instant permissions are granted.
  const [arView, setArView] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // "checking" avoids a hydration mismatch (identical on server + first
  // client render) and, crucially, keeps the camera/geolocation effects
  // below from firing at all until this resolves — so a first-time visitor
  // never sees a bare permission prompt before the explainer card.
  const [introState, setIntroState] = useState<"checking" | "show" | "hidden">("checking")
  const [locatingSlow, setLocatingSlow] = useState(false)
  const [showCalibrateHint, setShowCalibrateHint] = useState(false)
  const [showArrowCoach, setShowArrowCoach] = useState(false)
  const [typeFilter, setTypeFilter] = useState<"all" | DestGroup>("all")
  const [sortNearest, setSortNearest] = useState(false)
  const [cameraRetryKey, setCameraRetryKey] = useState(0)
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
  const watchIdRef = useRef<number | null>(null)
  const lastHeadingSampleRef = useRef<number | null>(null)
  const jitterEmaRef = useRef(0)
  const jitterStreakRef = useRef(0)
  const arrowCoachTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selected = destinations.find((d) => d.id === selectedId) ?? null

  const cameraOn = camStatus === "on"
  const showAr = cameraOn && compassReady && Boolean(selected)

  // Client-only: resolve whether the permission explainer has already been
  // dismissed. Runs once on mount, before the camera/geolocation effects
  // below (which are gated on `introState === "hidden"`) get a chance to.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setIntroState(readLocalFlag(INTRO_SEEN_KEY) ? "hidden" : "show")
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  // Mini-map needs the heading a few times a second (a radar wedge, not a
  // smooth animation), so it reads the same ref the 60fps arrow loop writes
  // to without forcing this component to re-render every frame. The same
  // tick also watches for a jittery, unsettled heading — the classic sign a
  // phone's compass needs the figure-8 recalibration wave — and surfaces a
  // one-time hint rather than leaving the arrow visibly shaky with no
  // explanation.
  useEffect(() => {
    if (!showAr) return
    const id = setInterval(() => {
      const cur = smoothRef.current
      setHeadingDisplay(cur)

      const last = lastHeadingSampleRef.current
      if (last != null) {
        let d = cur - last
        while (d > 180) d -= 360
        while (d < -180) d += 360
        jitterEmaRef.current = jitterEmaRef.current * 0.7 + Math.abs(d) * 0.3
        jitterStreakRef.current = jitterEmaRef.current > 10 ? jitterStreakRef.current + 1 : 0
        setShowCalibrateHint((prev) => {
          if (jitterStreakRef.current > 6) return true
          if (jitterStreakRef.current === 0) return false
          return prev
        })
      }
      lastHeadingSampleRef.current = cur
    }, 250)
    return () => {
      clearInterval(id)
      lastHeadingSampleRef.current = null
      jitterEmaRef.current = 0
      jitterStreakRef.current = 0
      setShowCalibrateHint(false)
    }
  }, [showAr])

  // ── Camera ────────────────────────────────────────────────────────────────
  // `cameraRetryKey` gives the "Try Again" button a way to force this effect
  // to run again after a decline, without duplicating the request logic.
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
        setCamError(null)
      } catch {
        if (!cancelled) {
          setCamError("Camera permission was declined. Use the list below instead.")
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

  // Once the stream is ready AND the AR view has mounted its <video>, attach
  // the stream (the video element only exists in AR mode). `arView` is in
  // the dependency list because the <video> element unmounts entirely when
  // the user exits back to the list and closing/reopening it needs the
  // stream reattached to the freshly mounted element, not just the first
  // time the camera turns on.
  useEffect(() => {
    if (camStatus === "on" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [camStatus, showAr, arView])

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
  // Paused while the tab/app is backgrounded — `enableHighAccuracy` GPS is
  // one of the biggest battery draws on a phone, and there's no point
  // tracking a position nobody's looking at.
  useEffect(() => {
    if (introState !== "hidden" || !navigator.geolocation) return
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
    function startWatch() {
      if (watchIdRef.current != null) return
      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      })
    }
    function stopWatch() {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
    function onVisibility() {
      if (document.hidden) stopWatch()
      else startWatch()
    }
    startWatch()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      stopWatch()
    }
  }, [introState])

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
    return {
      meters,
      label: formatDistanceMeters(meters),
      arrived: meters < ARRIVE_M,
      lowAccuracy: position.accuracy != null && position.accuracy > LOW_ACCURACY_M,
    }
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

  // "Locating you…" gets an escape hatch if GPS never resolves — a phone
  // with Location Services off at the OS level (not just denied in-browser)
  // would otherwise hang on that message forever with no way out but a
  // manual reload.
  useEffect(() => {
    if (!(showAr && arView) || position) {
      const id = window.setTimeout(() => setLocatingSlow(false), 0)
      return () => window.clearTimeout(id)
    }
    const t = setTimeout(() => setLocatingSlow(true), LOCATING_SLOW_MS)
    return () => clearTimeout(t)
  }, [showAr, arView, position])

  // One-time coach mark explaining what the arrow means, the first time the
  // camera view actually opens — addresses the "confusing arrow" feedback
  // by giving a first-time user a mental model before they have to guess.
  useEffect(() => {
    if (!(showAr && arView)) return
    if (readLocalFlag(ARROW_COACH_SEEN_KEY)) return
    const showId = window.setTimeout(() => setShowArrowCoach(true), 0)
    arrowCoachTimeoutRef.current = setTimeout(() => {
      setShowArrowCoach(false)
      writeLocalFlag(ARROW_COACH_SEEN_KEY)
    }, 4500)
    return () => {
      window.clearTimeout(showId)
      if (arrowCoachTimeoutRef.current) clearTimeout(arrowCoachTimeoutRef.current)
    }
  }, [showAr, arView])

  const dismissArrowCoach = useCallback(() => {
    if (arrowCoachTimeoutRef.current) clearTimeout(arrowCoachTimeoutRef.current)
    setShowArrowCoach(false)
    writeLocalFlag(ARROW_COACH_SEEN_KEY)
  }, [])

  // Shared by the fallback list and the bottom-sheet picker — filter by
  // destination kind and/or sort by live distance, since the directory grew
  // from 7 to 20 pins and a flat alphabetical list stopped being scannable.
  const visibleDestinations = useMemo(() => {
    let list = destinations
    if (typeFilter !== "all") {
      list = list.filter((d) => destinationGroup(d.type) === typeFilter)
    }
    if (sortNearest && position) {
      list = [...list].sort(
        (a, b) =>
          haversineMeters({ latitude: position.lat, longitude: position.lng }, { latitude: a.latitude, longitude: a.longitude }) -
          haversineMeters({ latitude: position.lat, longitude: position.lng }, { latitude: b.latitude, longitude: b.longitude }),
      )
    }
    return list
  }, [destinations, typeFilter, sortNearest, position])

  let statusMessage: string
  if (camStatus === "on" && !compassReady) {
    statusMessage =
      compass === "waiting"
        ? "Waiting for permission…"
        : compass === "off"
          ? "Motion and orientation are turned off. The arrow needs them to work."
          : "Enable your motion sensors to unlock the camera arrow."
  } else if (camStatus !== "on") {
    statusMessage =
      camError ?? "This feature needs a phone camera. On desktop, use the directions link instead."
  } else {
    statusMessage = "Open this on your phone for the live camera arrow."
  }

  if (destinations.length === 0) {
    return (
      <KEmpty
        icon="view_in_ar"
        title="Nothing to navigate to yet"
        body="The AR Directory has no destinations right now. Check back again soon."
      />
    )
  }

  // Render nothing for the one frame it takes to resolve whether the intro
  // has been seen before — matches server-rendered output exactly (no
  // hydration mismatch) and, more importantly, guarantees the permission
  // effects below can't fire before this check has run.
  if (introState === "checking") {
    return <Box sx={{ maxWidth: 720, mx: "auto", minHeight: 320 }} />
  }

  if (introState === "show") {
    return <ArIntroCard onStart={() => { writeLocalFlag(INTRO_SEEN_KEY); setIntroState("hidden") }} />
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

            <Box
              component="a"
              href={mapsDirectionsUrl(selected!.latitude, selected!.longitude)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open directions in Google Maps"
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
                textDecoration: "none",
              }}
            >
              <KIcon icon="map" size={19} />
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
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 0.75,
                  maxWidth: "82%",
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
                    whiteSpace: "nowrap",
                  }}
                >
                  Locating you…
                </Box>
                {locatingSlow && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setArView(false)}
                    sx={{
                      pointerEvents: "auto",
                      px: 1.5,
                      py: 0.625,
                      borderRadius: 999,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 550,
                      textAlign: "center",
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    Taking a while? Check that Location is turned on, or switch to the list view.
                  </Box>
                )}
              </Box>
            )}

            {showCalibrateHint && (
              <Box
                sx={{
                  position: "absolute",
                  top: position ? "16%" : "26%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.625,
                  borderRadius: 999,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 550,
                  maxWidth: "82%",
                  textAlign: "center",
                }}
              >
                <KIcon icon="explore" size={15} />
                Your compass looks unsteady. Wave your phone in a figure eight to calibrate it.
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
                perspective: "480px",
                perspectiveOrigin: "50% 20%",
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
                {/* Static ground tilt — the arrow lies flat and rotates on
                    that plane (like a compass needle), rather than facing
                    the viewer flat-on. This is what actually reads as "3D"
                    instead of a flat icon spinning in place. */}
                <Box
                  sx={{
                    transform: "rotateX(58deg)",
                    transformStyle: "preserve-3d",
                    transformOrigin: "50% 100%",
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
                      width="132"
                      height="150"
                      viewBox="0 0 100 116"
                      fill="none"
                      style={{ overflow: "visible", display: "block" }}
                    >
                      <defs>
                        <filter id="kiz-nav-glow" x="-80%" y="-80%" width="260%" height="260%">
                          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#000" floodOpacity="0.4" />
                        </filter>
                        {/* Top-lit face: light at the tip, deeper at the base — the
                            single biggest cue that sells volume over a flat icon. */}
                        <linearGradient id="kiz-arrow-face" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={arrived ? "#6FDB9A" : "#5B9CFB"} />
                          <stop offset="55%" stopColor={arrived ? color.success.main : NAV_BLUE} />
                          <stop offset="100%" stopColor={arrived ? "#1E8E5A" : "#0B4EA8"} />
                        </linearGradient>
                        {/* Left half in shadow, right half lit — the second cue,
                            simulating a shaded flank without full 3D geometry. */}
                        <linearGradient id="kiz-arrow-shadow-side" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
                          <stop offset="45%" stopColor="#000000" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="kiz-arrow-clip">
                          <path d="M50 4 L92 108 L50 84 L8 108 Z" />
                        </clipPath>
                      </defs>
                      <g filter="url(#kiz-nav-glow)">
                        <path d="M50 4 L92 108 L50 84 L8 108 Z" fill="url(#kiz-arrow-face)" />
                        <rect x="0" y="0" width="50" height="116" fill="url(#kiz-arrow-shadow-side)" clipPath="url(#kiz-arrow-clip)" />
                        {/* Glossy highlight streak near the nose, like a lit edge. */}
                        <path d="M50 4 L68 62 L50 52 Z" fill="#FFFFFF" opacity="0.35" />
                        <path
                          d="M50 4 L92 108 L50 84 L8 108 Z"
                          fill="none"
                          stroke="rgba(255,255,255,0.55)"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                      </g>
                    </svg>
                  </Box>
                </Box>

                {/* Ground shadow — anchors the arrow to the floor ahead. */}
                <Box
                  sx={{
                    width: 80,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: "rgba(0,0,0,0.38)",
                    filter: "blur(4px)",
                    mt: -0.5,
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Radar mini-map — where you are vs. where you're headed. */}
          {selected && (
            <ArMiniMap
              key={selected.id}
              position={position}
              destination={{ lat: selected.latitude, lng: selected.longitude }}
              heading={headingDisplay}
            />
          )}

          {/* First-run coach mark — explains what the arrow means before the
              user has to guess (the original "confusing" feedback). */}
          {showArrowCoach && (
            <Box
              component="button"
              type="button"
              onClick={dismissArrowCoach}
              sx={{
                position: "absolute",
                top: "34%",
                left: "50%",
                transform: "translateX(-50%)",
                pointerEvents: "auto",
                maxWidth: "78%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.75,
                px: 2,
                py: 1.5,
                borderRadius: `${radius.card}px`,
                backgroundColor: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#fff",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.18)",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <KIcon icon="explore" size={22} sx={{ color: NAV_BLUE }} />
              <Box sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
                This arrow points toward your destination. Rotate your phone to follow it.
              </Box>
              <Box sx={{ fontSize: 11, opacity: 0.7 }}>Tap to dismiss</Box>
            </Box>
          )}

          {/* Bottom bar — one consolidated instruction (turn hint, distance,
              walk time, low-accuracy note) instead of three separate floating
              pieces stacked under the arrow. Google's own AR Live View does
              the same: a single bottom bar, nothing else cluttering the
              screen. Removing that clutter is also what makes the mini-map's
              corner spot below actually free. */}
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
                gap: 1.25,
                px: 2,
                py: 1.25,
                borderRadius: `${radius.cardLg}px`,
                backgroundColor: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#fff",
                maxWidth: "92%",
              }}
            >
              <KIcon icon={arrived ? "celebration" : "near_me"} size={22} />
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.625, fontFamily: font.mono }}>
                  <Box component="span" sx={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {live?.lowAccuracy ? "~" : ""}
                    {live?.label ?? "—"}
                  </Box>
                  {live && (
                    <Box component="span" sx={{ fontSize: 13, fontWeight: 500, fontFamily: font.body, color: "rgba(255,255,255,0.72)" }}>
                      {arrived ? "arrived" : walkMins(live.meters)}
                    </Box>
                  )}
                </Box>
                <Box sx={{ fontSize: 12.5, fontWeight: 550, color: "rgba(255,255,255,0.9)", mt: 0.25 }}>
                  {arrived ? "You've arrived" : hint}
                  {live?.lowAccuracy && !arrived ? " · GPS signal is weak" : ""}
                </Box>
              </Box>
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

          {/* Action row — both ways to actually get moving (camera view and
              Google Maps) live together here, pinned above the destination
              list, so neither one needs scrolling past 20+ pins to reach. */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              p: { xs: 1.5, sm: 2 },
              borderBottom: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
            }}
          >
            {camError && camStatus !== "on" && (
              <Button
                variant="outlined"
                onClick={() => setCameraRetryKey((k) => k + 1)}
                disabled={camStatus === "waiting"}
                startIcon={<KIcon icon="refresh" size={17} />}
              >
                {camStatus === "waiting" ? "Asking…" : "Try camera again"}
              </Button>
            )}

            {camStatus === "on" && !compassReady && (
              <Button
                variant="contained"
                onClick={() => void requestCompass()}
                disabled={compass === "waiting"}
                startIcon={<KIcon icon="explore" size={17} />}
              >
                {compass === "waiting" ? "Asking…" : "Enable compass"}
              </Button>
            )}

            {cameraOn && compassReady && !arView && (
              <Button
                variant="contained"
                onClick={() => setArView(true)}
                startIcon={<KIcon icon="view_in_ar" size={17} />}
              >
                Open camera view
              </Button>
            )}

            {selected && (
              <Button
                component="a"
                href={mapsDirectionsUrl(selected.latitude, selected.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                startIcon={<KIcon icon="map" size={17} />}
              >
                Get directions in Google Maps
              </Button>
            )}
          </Box>

          {camStatus === "off" && camError && (
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                If trying again does not help, camera access may be blocked for this site in your
                browser settings, not just this page. Check there and reload.
              </Typography>
            </Box>
          )}

          <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2 }}>
            <ArFilterChips
              typeFilter={typeFilter}
              onTypeFilter={setTypeFilter}
              sortNearest={sortNearest}
              onToggleSort={() => setSortNearest((v) => !v)}
              positionAvailable={Boolean(position)}
            />
          </Box>

          <ListGroup>
            {visibleDestinations.map((d) => {
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
          <ArFilterChips
            typeFilter={typeFilter}
            onTypeFilter={setTypeFilter}
            sortNearest={sortNearest}
            onToggleSort={() => setSortNearest((v) => !v)}
            positionAvailable={Boolean(position)}
          />
          <ListGroup>
            {visibleDestinations.map((d) => {
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

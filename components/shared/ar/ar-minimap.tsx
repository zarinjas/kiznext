"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import "leaflet/dist/leaflet.css"
import type { Map as LeafletMap, Marker, Polyline } from "leaflet"
import { KIcon } from "@/components/kiz/primitives/icon"

interface LatLng {
  lat: number
  lng: number
}

interface Props {
  /** Live device position, null while still locating. */
  position: LatLng | null
  /** Chosen destination. */
  destination: LatLng
  /** Live compass heading in degrees — rotates the whole map to heading-up. */
  heading: number
  /** Real walking-path route from lib/routing.ts, when one has been fetched. Falls back to a straight line to `destination` when null. */
  route?: LatLng[] | null
}

function pathFor(position: LatLng | null, destination: LatLng, route: LatLng[] | null | undefined): [number, number][] {
  if (route && route.length > 1) return route.map((p) => [p.lat, p.lng])
  if (position) return [[position.lat, position.lng], [destination.lat, destination.lng]]
  return [[destination.lat, destination.lng]]
}

const NAV_BLUE = "#1A73E8"
// How much bigger than the visible circle the map div is rendered at, so
// rotating it never reveals blank corners. A square centred on the same
// point as the circle fully covers it at every rotation angle as long as
// its half-width is at least the circle's radius — 1.3x gives comfortable
// margin over the bare minimum (1.0x).
const OVERSCAN = 1.3
const RADAR_DIAMETER = 108
// `fitBounds` sizes its fit to the map div's REAL pixel size, which is the
// oversized (OVERSCAN×) square, not the smaller circle the user can actually
// see — so a naive small padding leaves the pin/route fit snugly into the
// square while the visible circle only shows its centre, cropping in on
// what looked like it should have breathing room. This adds back the ring
// that overscan hides, plus a bit of genuine visible margin, so "fits
// nicely" in the code matches "fits nicely" on screen.
const RADAR_PADDING = (RADAR_DIAMETER * (OVERSCAN - 1)) / 2 + 20

/**
 * Small always-on radar map pinned bottom-right of the AR camera view — shows
 * where the walker is relative to the destination, the way Google/Apple Maps'
 * walking-navigation mini-map does. Leaflet + plain OSM tiles (no API key);
 * loaded client-side only since it touches `window`/the DOM directly.
 *
 * Rotates heading-up (matches the main AR arrow's own frame of reference —
 * "what's ahead of me is up") instead of staying fixed north-up with a
 * separate rotating wedge on top, which made you mentally translate map-north
 * into your actual facing direction every time you glanced at it. The CSS
 * rotation is applied to the plain div Leaflet manages as its container —
 * that's a pure paint-time transform, so it doesn't touch Leaflet's own
 * pixel/offset math, only what you visually see. Markers counter-rotate by
 * the same angle so they stay upright.
 */
function userIconHtml() {
  return `<div class="ar-counter-rotate" style="position:relative;width:14px;height:14px;">
    <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(26,115,232,0.25);"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:${NAV_BLUE};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
  </div>`
}

function destIconHtml() {
  return `<div class="ar-counter-rotate">
    <div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:#EA4335;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
  </div>`
}

export function ArMiniMap({ position, destination, heading, route }: Props) {
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  // Leaflet's own map object can outlive the point where we've called
  // `.remove()` on it (an in-flight `await import("leaflet")` elsewhere still
  // holds the reference), so `mapRef.current` alone isn't a safe "is this
  // still usable" check. This flag is the source of truth for that.
  const aliveRef = useRef(false)
  const userMarkerRef = useRef<Marker | null>(null)
  const destMarkerRef = useRef<Marker | null>(null)
  const lineRef = useRef<Polyline | null>(null)

  // Init once.
  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        fadeAnimation: false,
      }).setView([destination.lat, destination.lng], 17)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      const destIcon = L.divIcon({ className: "", html: destIconHtml(), iconSize: [16, 16], iconAnchor: [8, 15] })
      destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map)

      const userIcon = L.divIcon({ className: "", html: userIconHtml(), iconSize: [14, 14], iconAnchor: [7, 7] })
      if (position) {
        userMarkerRef.current = L.marker([position.lat, position.lng], { icon: userIcon }).addTo(map)
        const path = pathFor(position, destination, route)
        lineRef.current = L.polyline(path, { color: NAV_BLUE, weight: 3, opacity: 0.95 }).addTo(map)
        map.fitBounds(path, { padding: [RADAR_PADDING, RADAR_PADDING], maxZoom: 18 })
      }

      mapRef.current = map
      aliveRef.current = true
    }

    void init()
    return () => {
      cancelled = true
      aliveRef.current = false
      map?.remove()
      mapRef.current = null
      userMarkerRef.current = null
      destMarkerRef.current = null
      lineRef.current = null
    }
    // Destination is fixed for the lifetime of one AR session view; a
    // destination switch remounts this component via `key` in the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the user dot + line live without re-creating the map. Guarded with
  // its own `cancelled` flag and the shared `aliveRef` because this effect
  // re-runs on every position tick — if the map got torn down (destination
  // switched, component unmounted) while an earlier run's `import("leaflet")`
  // was still pending, that stale run must not touch the dead map.
  useEffect(() => {
    if (!position) return
    let cancelled = false
    void (async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !aliveRef.current || !mapRef.current) return
      const map = mapRef.current
      const latlng: [number, number] = [position.lat, position.lng]

      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({ className: "", html: userIconHtml(), iconSize: [14, 14], iconAnchor: [7, 7] })
        userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(map)
        applyCounterRotation(userMarkerRef.current, heading)
      } else {
        userMarkerRef.current.setLatLng(latlng)
      }

      const path = pathFor(position, destination, route)
      if (!lineRef.current) {
        lineRef.current = L.polyline(path, { color: NAV_BLUE, weight: 3, opacity: 0.95 }).addTo(map)
      } else {
        lineRef.current.setLatLngs(path)
      }

      map.fitBounds(path, { padding: [RADAR_PADDING, RADAR_PADDING], maxZoom: 18 })
    })()
    return () => {
      cancelled = true
    }
    // `heading` deliberately excluded — only used here for a freshly created
    // marker's initial rotation; live updates are handled by the dedicated
    // heading effect below so a compass tick doesn't also re-run this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, destination, route])

  // Heading-up rotation: spin the map container opposite the compass heading
  // so "up" always means "the way you're facing", and counter-rotate both
  // markers by the same amount so they stay visually upright. Runs on its
  // own (cheap — direct DOM style writes, no React state) at whatever cadence
  // the parent samples the compass at, independent of position/route updates.
  useEffect(() => {
    if (containerRef.current) containerRef.current.style.transform = `translate(-50%, -50%) rotate(${-heading}deg)`
    applyCounterRotation(userMarkerRef.current, heading)
    applyCounterRotation(destMarkerRef.current, heading)
  }, [heading])

  // The expanded map opened via plain React state, so the phone's back
  // button had no idea it existed and just fell through to the browser's
  // normal history — taking the user straight out to wherever they were
  // before AR (e.g. the More section) instead of closing the map. Pushing a
  // history entry while expanded means back closes the map first (via the
  // popstate below) and only leaves the page on a second press, matching
  // how a full-screen overlay is expected to behave.
  useEffect(() => {
    if (!expanded) return
    window.history.pushState({ arFullMap: true }, "")
    const onPopState = () => setExpanded(false)
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [expanded])

  function closeExpanded() {
    // Go through the same history entry the effect above pushed, so the
    // "X" button and the phone's back button both resolve the same way —
    // no orphaned forward history entry left dangling either way.
    window.history.back()
  }

  return (
    <>
    <Box
      component="button"
      type="button"
      onClick={() => setExpanded(true)}
      aria-label="Expand map"
      sx={{
        position: "absolute",
        right: 14,
        // Bottom-right, sitting above the single consolidated bottom bar
        // (turn hint + distance + accuracy note now live together there,
        // not as three separate floating pieces). The arrow itself is
        // narrow and centred, so a corner box doesn't visually collide with
        // it even where their bounding boxes share the same vertical band —
        // the earlier collisions were always with wide, centred text
        // (the old distance pill and the "Locating you…" hints), not the
        // arrow. Those are what actually needed to shrink, not this map.
        bottom: "calc(env(safe-area-inset-bottom) + 128px)",
        width: 108,
        height: 108,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.9)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
        p: 0,
        backgroundColor: "transparent",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        "& .leaflet-container": { background: "#e5e3df", fontFamily: "inherit" },
      }}
    >
      {/* North indicator — the map itself is what rotates now (heading-up),
          so this small label is what tells you which way true north
          currently sits, orbiting the rim as you turn. */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 500,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box sx={{ width: 0, height: 0, transform: `rotate(${heading}deg)`, transformOrigin: "50% 50%", position: "relative" }}>
          <Box
            sx={{
              position: "absolute",
              left: -9,
              top: -50,
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            N
          </Box>
        </Box>
      </Box>
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${OVERSCAN * 100}%`,
          height: `${OVERSCAN * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </Box>
    {expanded && (
      <ArFullMap position={position} destination={destination} route={route} onClose={closeExpanded} />
    )}
    </>
  )
}

/**
 * Full-screen interactive map opened by tapping the small radar — dragging,
 * pinch-zoom and zoom buttons are all enabled here (unlike the tiny fixed
 * radar), north-up, its own separate Leaflet instance so the two never
 * fight over one map's state.
 */
function ArFullMap({
  position,
  destination,
  route,
  onClose,
}: {
  position: LatLng | null
  destination: LatLng
  route: LatLng[] | null | undefined
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const aliveRef = useRef(false)
  const userMarkerRef = useRef<Marker | null>(null)
  const lineRef = useRef<Polyline | null>(null)

  useEffect(() => {
    let cancelled = false
    let map: LeafletMap | null = null

    async function init() {
      const L = (await import("leaflet")).default
      if (cancelled || !containerRef.current) return

      map = L.map(containerRef.current, { zoomControl: true, attributionControl: true })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map)

      const destIcon = L.divIcon({ className: "", html: destIconHtml(), iconSize: [16, 16], iconAnchor: [8, 15] })
      L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map)

      const path = pathFor(position, destination, route)
      if (position) {
        const userIcon = L.divIcon({ className: "", html: userIconHtml(), iconSize: [14, 14], iconAnchor: [7, 7] })
        userMarkerRef.current = L.marker([position.lat, position.lng], { icon: userIcon }).addTo(map)
        lineRef.current = L.polyline(path, { color: NAV_BLUE, weight: 3, opacity: 0.95 }).addTo(map)
      }
      map.fitBounds(path, { padding: [32, 32], maxZoom: 18 })

      mapRef.current = map
      aliveRef.current = true
      // The container's real on-screen size isn't settled until this dialog
      // has finished animating/laying out — without this, Leaflet can size
      // itself off a stale (often zero) measurement and render blank.
      setTimeout(() => map?.invalidateSize(), 50)
    }

    void init()
    return () => {
      cancelled = true
      aliveRef.current = false
      map?.remove()
      mapRef.current = null
      userMarkerRef.current = null
      lineRef.current = null
    }
    // Opens fresh each time (mounted only while `expanded`), so init only
    // needs to run once per mount — live position updates aren't needed for
    // a map the user is actively panning/zooming themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        backgroundColor: "background.paper",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <Box
        component="button"
        type="button"
        onClick={onClose}
        aria-label="Close map"
        sx={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top) + 12px)",
          right: 14,
          width: 42,
          height: 42,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.16)",
          color: "#fff",
          cursor: "pointer",
          zIndex: 2001,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <KIcon icon="close" size={20} />
      </Box>
    </Box>
  )
}

function applyCounterRotation(marker: Marker | null | undefined, heading: number) {
  const el = marker?.getElement()
  const inner = el?.querySelector<HTMLElement>(".ar-counter-rotate")
  if (inner) inner.style.transform = `rotate(${heading}deg)`
}

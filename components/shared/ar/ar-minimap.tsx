"use client"

import { useEffect, useRef } from "react"
import Box from "@mui/material/Box"
import "leaflet/dist/leaflet.css"
import type { Map as LeafletMap, Marker, Polyline } from "leaflet"

interface LatLng {
  lat: number
  lng: number
}

interface Props {
  /** Live device position, null while still locating. */
  position: LatLng | null
  /** Chosen destination. */
  destination: LatLng
  /** Live compass heading in degrees, for the "you are facing" wedge. */
  heading: number
}

const NAV_BLUE = "#1A73E8"

/**
 * Small always-on radar map pinned bottom-right of the AR camera view — shows
 * where the walker is relative to the destination, the way Google/Apple Maps'
 * walking-navigation mini-map does. Leaflet + plain OSM tiles (no API key);
 * loaded client-side only since it touches `window`/the DOM directly.
 */
function userIconHtml() {
  return `<div style="position:relative;width:14px;height:14px;">
    <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(26,115,232,0.25);"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:${NAV_BLUE};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>
  </div>`
}

export function ArMiniMap({ position, destination, heading }: Props) {
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

      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:#EA4335;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 15],
      })
      destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map)

      const userIcon = L.divIcon({
        className: "",
        html: userIconHtml(),
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      if (position) {
        userMarkerRef.current = L.marker([position.lat, position.lng], { icon: userIcon }).addTo(map)
        lineRef.current = L.polyline(
          [
            [position.lat, position.lng],
            [destination.lat, destination.lng],
          ],
          { color: NAV_BLUE, weight: 2, dashArray: "4 5", opacity: 0.85 },
        ).addTo(map)
        map.fitBounds(
          [
            [position.lat, position.lng],
            [destination.lat, destination.lng],
          ],
          { padding: [18, 18], maxZoom: 18 },
        )
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
        const userIcon = L.divIcon({
          className: "",
          html: userIconHtml(),
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(map)
      } else {
        userMarkerRef.current.setLatLng(latlng)
      }

      if (!lineRef.current) {
        lineRef.current = L.polyline([latlng, [destination.lat, destination.lng]], {
          color: NAV_BLUE,
          weight: 2,
          dashArray: "4 5",
          opacity: 0.85,
        }).addTo(map)
      } else {
        lineRef.current.setLatLngs([latlng, [destination.lat, destination.lng]])
      }

      map.fitBounds([latlng, [destination.lat, destination.lng]], { padding: [18, 18], maxZoom: 18 })
    })()
    return () => {
      cancelled = true
    }
  }, [position, destination])

  return (
    <Box
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
        width: 100,
        height: 100,
        borderRadius: "16px",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.85)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
        "& .leaflet-container": { background: "#e5e3df", fontFamily: "inherit" },
      }}
    >
      {/* Fixed heading wedge — shows which way the phone is facing, radar-style. */}
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
        <Box
          sx={{
            width: 0,
            height: 0,
            transform: `rotate(${heading}deg)`,
            transformOrigin: "50% 50%",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              left: -9,
              top: -46,
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderBottom: "16px solid rgba(26,115,232,0.28)",
            }}
          />
        </Box>
      </Box>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </Box>
  )
}

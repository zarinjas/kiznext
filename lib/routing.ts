/**
 * Real walking-path routing for the AR arrow, so it points along an actual
 * route instead of a straight line through whatever building or wall
 * happens to be between the walker and the destination.
 *
 * Uses OSRM's free public demo server (router.project-osrm.org) — no API
 * key, no cost, no signup. The honest caveat: it's a public demo instance,
 * not an SLA-backed production service, so every call site here must treat
 * a failed/slow/rate-limited response as routine and fall back to the
 * existing straight-line bearing rather than breaking the feature. If usage
 * ever grows enough to need a reliable dedicated router, this is the one
 * file to swap for a self-hosted OSRM instance or a paid provider.
 */

import { haversineMeters, type LatLng } from "@/lib/geo"

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot"
const FETCH_TIMEOUT_MS = 6000

/** Fetches a walking route from `from` to `to` as an ordered list of points along the path. Returns null on any failure — callers must fall back to a direct bearing. */
export async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url = `${OSRM_BASE}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const json = await res.json()
    const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates
    if (!coords || coords.length < 2) return null
    return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Given a route (ordered points from origin to destination) and the
 * walker's live position, returns the next point on the route to aim the
 * arrow at — the closest route point that's still meaningfully ahead, so
 * the arrow follows the path segment-by-segment as the walker moves instead
 * of jumping straight to the final destination.
 */
export function nextRouteTarget(route: LatLng[], position: LatLng, lookaheadM = 8): LatLng {
  if (route.length === 0) return position
  let closestIdx = 0
  let closestDist = Infinity
  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(position, route[i])
    if (d < closestDist) {
      closestDist = d
      closestIdx = i
    }
  }
  // Walk forward from the closest point until we've covered `lookaheadM`
  // metres of route, so the arrow points a little ahead rather than at the
  // exact point the walker is already standing on.
  let idx = closestIdx
  let accumulated = 0
  while (idx < route.length - 1 && accumulated < lookaheadM) {
    accumulated += haversineMeters(route[idx], route[idx + 1])
    idx++
  }
  return route[idx]
}

/** Remaining walking distance along the route from the walker's live position, instead of a straight line through whatever's in between. */
export function routeRemainingMeters(route: LatLng[], position: LatLng): number {
  if (route.length === 0) return 0
  let closestIdx = 0
  let closestDist = Infinity
  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(position, route[i])
    if (d < closestDist) {
      closestDist = d
      closestIdx = i
    }
  }
  let remaining = closestDist
  for (let i = closestIdx; i < route.length - 1; i++) {
    remaining += haversineMeters(route[i], route[i + 1])
  }
  return remaining
}

/**
 * Real walking-path routing for the AR arrow, so it points along an actual
 * route instead of a straight line through whatever building happens to be
 * between the walker and the destination.
 *
 * Uses OSRM's free public demo server (router.project-osrm.org) — no API key,
 * no cost, no signup. That server is explicitly not intended for production and
 * is rate-limited, so this module treats a failed/slow/throttled response as
 * routine and degrades to a straight-line bearing.
 *
 * Three safeguards on top of the raw call, because a judging room has poor
 * connectivity and a rate-limited upstream:
 *
 *  1. **Short-lived cache** keyed on rounded endpoints, so repeated position
 *     updates don't re-request a route the walker has barely moved along.
 *  2. **Circuit breaker** — after repeated failures the module stops calling out
 *     for a cooldown window rather than hammering a server that is already
 *     unhappy. This is both polite and the difference between "slow" and "hung"
 *     when every request is waiting on a 6s timeout.
 *  3. **Explicit degradation signal** (`fetchWalkingRouteDetailed`) so the UI can
 *     *say* the line is a straight-line estimate instead of silently drawing
 *     something that looks like a path but isn't.
 */

import { haversineMeters, type LatLng } from "./geo"

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot"
const FETCH_TIMEOUT_MS = 6000

/** Routes are cached at ~11m resolution and reused for a short window. */
const CACHE_TTL_MS = 30_000
const CACHE_ROUND = 4 // decimal places ≈ 11m

/** Stop calling OSRM for this long after `FAILURE_THRESHOLD` consecutive fails. */
const FAILURE_THRESHOLD = 3
const COOLDOWN_MS = 60_000

interface CacheEntry {
  points: LatLng[]
  at: number
}

const cache = new Map<string, CacheEntry>()
let consecutiveFailures = 0
let cooldownUntil = 0

export interface WalkingRoute {
  /** Ordered route points, or null when routing is unavailable. */
  points: LatLng[] | null
  /**
   * True when this is a straight-line estimate rather than a real walking path.
   * The caller should label it as such.
   */
  degraded: boolean
  /** Why it degraded, for a tooltip/diagnostic. */
  reason?: "offline" | "timeout" | "throttled" | "cooldown" | "no-route"
}

function cacheKey(from: LatLng, to: LatLng): string {
  const r = (n: number) => n.toFixed(CACHE_ROUND)
  return `${r(from.latitude)},${r(from.longitude)}|${r(to.latitude)},${r(to.longitude)}`
}

/**
 * Walking route with an explicit degradation signal.
 *
 * Prefer this over `fetchWalkingRoute` — it tells the UI whether to label the
 * line as an estimate, which matters for honesty and for demo credibility.
 */
export async function fetchWalkingRouteDetailed(
  from: LatLng,
  to: LatLng
): Promise<WalkingRoute> {
  // Respect an open circuit.
  if (Date.now() < cooldownUntil) {
    return { points: null, degraded: true, reason: "cooldown" }
  }

  const key = cacheKey(from, to)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { points: hit.points, degraded: false }
  }

  const url = `${OSRM_BASE}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })

    if (res.status === 429) {
      tripBreaker()
      return { points: null, degraded: true, reason: "throttled" }
    }
    if (!res.ok) {
      tripBreaker()
      return { points: null, degraded: true, reason: "no-route" }
    }

    const json = await res.json()
    const coords: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates
    if (!coords || coords.length < 2) {
      // A legitimate "no foot route" answer, not a failure — don't trip.
      return { points: null, degraded: true, reason: "no-route" }
    }

    const points = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
    consecutiveFailures = 0
    cache.set(key, { points, at: Date.now() })
    // Bound the cache so a long walk can't grow it without limit.
    if (cache.size > 64) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0]
      if (oldest) cache.delete(oldest[0])
    }
    return { points, degraded: false }
  } catch (err) {
    tripBreaker()
    const aborted = err instanceof Error && err.name === "AbortError"
    return { points: null, degraded: true, reason: aborted ? "timeout" : "offline" }
  } finally {
    clearTimeout(timeout)
  }
}

function tripBreaker(): void {
  consecutiveFailures += 1
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    cooldownUntil = Date.now() + COOLDOWN_MS
    consecutiveFailures = 0
  }
}

/** True while the circuit breaker is open (routing known-unavailable). */
export function isRoutingCoolingDown(): boolean {
  return Date.now() < cooldownUntil
}

/** Test/reset hook — clears the cache and closes the breaker. */
export function resetRoutingState(): void {
  cache.clear()
  consecutiveFailures = 0
  cooldownUntil = 0
}

/**
 * Walking route from `from` to `to` as ordered points, or null on failure.
 *
 * Backwards-compatible wrapper retained for existing callers (including the web
 * app). New code should prefer `fetchWalkingRouteDetailed` so it can label a
 * straight-line fallback.
 */
export async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  return (await fetchWalkingRouteDetailed(from, to)).points
}

/** Next route point to aim at — closest route point still meaningfully ahead. */
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
  let idx = closestIdx
  let accumulated = 0
  while (idx < route.length - 1 && accumulated < lookaheadM) {
    accumulated += haversineMeters(route[idx], route[idx + 1])
    idx++
  }
  return route[idx]
}

/** Remaining walking distance along the route from the live position. */
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

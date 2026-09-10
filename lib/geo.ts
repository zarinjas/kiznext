/** Geo helpers for the AR Directory. Pure functions — safe on server & client. */

export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_M = 6371000

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two points in metres (haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

/** Initial bearing from `a` to `b` in degrees (0 = north, clockwise). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLng = toRad(b.longitude - a.longitude)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/** Human-friendly distance: "120 m" under 1 km, "1.4 km" above. */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—"
  if (meters < 1000) return `${Math.max(0, Math.round(meters))} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/** Normalise an angle difference into [-180, 180] — the shortest turn to face `target`. */
export function headingDelta(targetDeg: number, headingDeg: number): number {
  let delta = (targetDeg - headingDeg) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return delta
}

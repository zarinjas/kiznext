/**
 * Next.js instrumentation hook — runs once when a server instance boots.
 * Starts the accommodation auto-sync poller (opt-in via
 * `ACCOMMODATION_SYNC_INTERVAL_MINUTES`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (process.env.NEXT_PHASE === "phase-production-build") return

  const { startAccommodationAutoSync } = await import("@/lib/accommodation-auto-sync")
  startAccommodationAutoSync()
}

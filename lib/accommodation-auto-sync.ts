import { runAutoSync } from "@/lib/accommodation-sync-runner"

const FLAG = "__kizAccommodationAutoSyncStarted"
type GlobalWithFlag = typeof globalThis & { [FLAG]?: boolean }

/**
 * In-process poller for the accommodation Google Sheet, started once per server
 * process from `instrumentation.ts`. Controlled by
 * `ACCOMMODATION_SYNC_INTERVAL_MINUTES` (unset or 0 = disabled).
 *
 * Polls the sheet on an interval and applies it only when the content changed
 * (see `runAutoSync`) — so an idle sheet costs one Sheets API read per tick, not
 * a database transaction. A global flag prevents duplicate timers under dev HMR.
 */
export function startAccommodationAutoSync(): void {
  const g = globalThis as GlobalWithFlag
  if (g[FLAG]) return

  const minutes = Number(process.env.ACCOMMODATION_SYNC_INTERVAL_MINUTES ?? "0")
  if (!Number.isFinite(minutes) || minutes <= 0) return
  g[FLAG] = true

  const tick = () => {
    void runAutoSync()
      .then((r) => {
        if (r.skipped) return
        if (r.ok) {
          console.log(
            `[accommodation-sync] applied: +${r.added ?? 0} moved ${r.moved ?? 0} ` +
              `released ${r.released ?? 0} removed ${r.removed ?? 0} rooms ${r.roomsSynced ?? 0}`,
          )
        } else if (r.reason) {
          console.log(`[accommodation-sync] skipped (${r.reason})`)
        } else {
          console.error(`[accommodation-sync] failed: ${r.error}`)
        }
      })
      .catch((e) => console.error("[accommodation-sync] unexpected error", e))
  }

  console.log(`[accommodation-sync] enabled — polling every ${minutes} min`)
  // Let the server finish booting before the first poll.
  const first = setTimeout(tick, 30_000)
  const timer = setInterval(tick, minutes * 60_000)
  first.unref?.()
  timer.unref?.()
}

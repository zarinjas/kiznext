import { getSheetSyncIntervalMinutes } from "@/lib/google-sheets"
import { runAutoSync } from "@/lib/accommodation-sync-runner"

const FLAG = "__kizAccommodationAutoSyncStarted"
type GlobalWithFlag = typeof globalThis & { [FLAG]?: boolean }

/** How often to re-check the interval when auto-sync is currently disabled. */
const DISABLED_RECHECK_MS = 60_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    t.unref?.()
  })
}

async function doSync(): Promise<void> {
  try {
    const r = await runAutoSync()
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
  } catch (e) {
    console.error("[accommodation-sync] unexpected error", e)
  }
}

/**
 * Self-rescheduling poller for the accommodation Google Sheet, started once per
 * server process from `instrumentation.ts`. The interval is read live from the
 * AppSetting each cycle (env fallback), so an admin can change it in the UI
 * without a restart. `0` = disabled (the setting is still re-checked so it can
 * be turned on later without a restart).
 */
export function startAccommodationAutoSync(): void {
  const g = globalThis as GlobalWithFlag
  if (g[FLAG]) return
  g[FLAG] = true

  let firstRun = true
  const loop = async (): Promise<void> => {
    const minutes = await getSheetSyncIntervalMinutes()
    const enabled = Number.isFinite(minutes) && minutes > 0

    if (enabled) {
      if (firstRun) console.log(`[accommodation-sync] enabled — polling every ${minutes} min`)
      await doSync()
    }
    firstRun = false

    // When enabled, wait the configured interval; when disabled, re-check the
    // setting shortly so turning it on needs no restart.
    const waitMs = enabled ? Math.max(1, minutes) * 60_000 : DISABLED_RECHECK_MS
    await sleep(waitMs)
    void loop()
  }

  // Give the server a moment to finish booting before the first poll.
  void sleep(30_000).then(() => void loop())
}

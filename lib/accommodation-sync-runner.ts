import { fetchSheetCsv, getSheetConfig, getSheetLastHash } from "@/lib/google-sheets"
import { hashSyncModel, runApplySync, type SyncResult } from "@/lib/bilik-sync"

export interface AutoSyncResult extends SyncResult {
  /** True when the sheet's sync-relevant content is identical to the last apply. */
  skipped?: boolean
  /** Why nothing was applied (not configured / already running). */
  reason?: string
}

/**
 * Poll the configured Google Sheet and apply it only when its content changed
 * since the last successful apply. The expensive `runApplySync` transaction is
 * skipped when the hash is unchanged, so polling frequently is cheap.
 *
 * Guarded so overlapping ticks (a slow apply while the next interval fires)
 * can't run two syncs at once.
 */
let running = false

export async function runAutoSync(): Promise<AutoSyncResult> {
  if (running) return { ok: false, reason: "already-running" }
  running = true
  try {
    const cfg = await getSheetConfig()
    if (!cfg.serviceAccount || !cfg.spreadsheetId || !cfg.range) {
      return { ok: false, reason: "not-configured" }
    }

    const csv = await fetchSheetCsv()
    const hash = hashSyncModel(csv)
    if (hash === (await getSheetLastHash())) return { ok: true, skipped: true }

    // `runApplySync` stores the hash itself on success, so a failed apply is
    // retried on the next tick.
    return { ...(await runApplySync(csv)), skipped: false }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Auto-sync failed" }
  } finally {
    running = false
  }
}

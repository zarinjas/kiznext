import * as Brightness from "expo-brightness"
import { useEffect } from "react"

/**
 * Temporarily raise screen brightness while a screen is focused.
 *
 * The Digital Resident ID exists to be shown to a security officer, often
 * outdoors or in a dim lobby, and a dim screen makes a QR slow or impossible to
 * scan. Every wallet and ticketing app does this; it is the difference between
 * the card working at the gate and the resident apologising while they fumble
 * with their settings.
 *
 * Restores the previous value on blur/unmount, and uses the *app-scoped*
 * brightness API so the system setting is never permanently changed. Entirely
 * best-effort: a permission refusal or an unsupported platform is a no-op, never
 * an error the user sees.
 */
export function useBoostBrightness(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let restore: number | null = null

    ;(async () => {
      try {
        // `getBrightnessAsync` reads the current app brightness so it can be put
        // back exactly as it was.
        restore = await Brightness.getBrightnessAsync()
        if (cancelled) return
        await Brightness.setBrightnessAsync(1)
      } catch {
        restore = null
      }
    })()

    return () => {
      cancelled = true
      if (restore == null) {
        // Nothing was changed, or we never learned the original value — ask the
        // OS to resume control rather than guessing a level.
        Brightness.restoreSystemBrightnessAsync?.().catch(() => {})
        return
      }
      Brightness.setBrightnessAsync(restore).catch(() => {})
    }
  }, [enabled])
}

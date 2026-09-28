import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

/**
 * Haptic feedback — the cheapest perceived-quality upgrade in the app.
 *
 * Every call is fire-and-forget and swallows its own errors: haptics are an
 * enhancement, never a dependency. Android's implementation is coarser and
 * noticeably buzzier than iOS's Taptic Engine, so the light "every tap" tiers
 * are iOS-only; meaningful events (success/warning/error/heavy) fire on both.
 */

const isIOS = Platform.OS === "ios"

function safe(run: () => Promise<unknown>): void {
  void run().catch(() => {})
}

/** Standard tap — buttons, list rows, chips. iOS only (too buzzy on Android). */
export function tapLight(): void {
  if (!isIOS) return
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

/** Selection change — tab switch, segmented control, filter chip. */
export function tapSelection(): void {
  if (!isIOS) return
  safe(() => Haptics.selectionAsync())
}

/** Deliberate/weighty action — sheet commit, SOS hold tick, scan acquired. */
export function tapMedium(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

/** Heavy — the moment an emergency call actually fires. */
export function tapHeavy(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

/** Something completed — booking confirmed, reminder started, reply sent. */
export function notifySuccess(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

/** Something needs attention but isn't broken — validation, overwrite confirm. */
export function notifyWarning(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

/** Something failed — network error, rejected submit. */
export function notifyError(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
}

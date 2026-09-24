import AsyncStorage from "@react-native-async-storage/async-storage"
import * as LocalAuthentication from "expo-local-authentication"

/**
 * Optional biometric app lock. When enabled, a stored session requires Face ID /
 * fingerprint before the app unlocks on cold start. The flag is device-local
 * (AsyncStorage) — never sent to the server.
 */

const KEY = "kiz.biometric.enabled"

/** True when the device has biometric hardware with an enrolled credential. */
export async function biometricSupported(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ])
  return hasHardware && enrolled
}

/** "Face ID" / "Fingerprint" / "Biometrics" — for the toggle label. */
export async function biometricLabel(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face ID"
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "Fingerprint"
  return "Biometric unlock"
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === "1"
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await AsyncStorage.setItem(KEY, "1")
  else await AsyncStorage.removeItem(KEY)
}

export interface BiometricResult {
  success: boolean
  /** True when the user actively cancelled, vs. the sensor failing. */
  cancelled: boolean
  /** Human-readable reason, for surfacing in the UI. */
  reason?: string
}

/**
 * Prompt for biometric (or device-passcode) authentication.
 *
 * `disableDeviceFallback: false` is deliberate: it lets the OS offer
 * "Enter Passcode" after a failed scan, so a user with a wet finger or a
 * failing sensor is never locked out of their own account. Returning a
 * structured result rather than a bare boolean lets callers distinguish
 * "user chose not to" from "authentication failed" — previously both collapsed
 * to `false` and the UI could say nothing useful.
 */
export async function authenticateDetailed(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      // Allows the OS passcode as a fallback — the escape hatch when the
      // biometric sensor cannot succeed.
      disableDeviceFallback: false,
    })

    if (result.success) return { success: true, cancelled: false }

    const error = "error" in result ? result.error : undefined

    // `user_fallback` means they chose the passcode route and then backed out;
    // treat it as a cancel rather than a failure so we don't scold them.
    const cancelled = error === "user_fallback" || error === undefined

    const reason =
      error === "passcode_not_set"
        ? "Set a device passcode to use app lock."
        : error === "not_available"
          ? "This device can't do biometric unlock."
          : error === "timeout"
            ? "The unlock prompt timed out. Try again."
            : error === "authentication_failed" || error === "unable_to_process"
              ? "That didn't match. Try again, or use your device passcode."
              : "Authentication didn't succeed."

    return { success: false, cancelled, reason: cancelled ? undefined : reason }
  } catch {
    return { success: false, cancelled: false, reason: "Authentication is unavailable." }
  }
}

/** Boolean-only convenience wrapper, kept for existing call sites. */
export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  return (await authenticateDetailed(promptMessage)).success
}

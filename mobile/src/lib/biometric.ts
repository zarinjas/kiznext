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

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    })
    return result.success
  } catch {
    return false
  }
}

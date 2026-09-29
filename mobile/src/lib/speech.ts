import * as Speech from "expo-speech"
import { setAudioModeAsync } from "expo-audio"

/**
 * Text-to-speech for the AR Translate (KIZ Lens) results. Maps the app's short
 * language codes to BCP-47 locales the OS speech engine understands.
 *
 * `expo-speech` doesn't expose its own audio session config, and on iOS it
 * defaults to respecting the hardware silent switch — so the "Listen" button
 * produces nothing when the phone is muted. Setting the shared audio mode
 * once (via expo-audio) fixes that for every `Speech.speak()` call after it.
 */
setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
const LOCALE: Record<string, string> = {
  zh: "zh-CN",
  id: "id-ID",
  ar: "ar-SA",
  ta: "ta-IN",
  bn: "bn-BD",
  ja: "ja-JP",
  th: "th-TH",
  ur: "ur-PK",
  en: "en-MY",
  ms: "ms-MY",
}

export function localeFor(code: string): string {
  return LOCALE[code] ?? code
}

/** Speak `text` in `langCode`, stopping anything already playing. */
export function speak(text: string, langCode: string): void {
  const value = text.trim()
  if (!value) return
  Speech.stop()
  Speech.speak(value, { language: localeFor(langCode) })
}

export function stopSpeaking(): void {
  Speech.stop()
}

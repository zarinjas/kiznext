import * as Speech from "expo-speech"

/**
 * Text-to-speech for the AR Translate (KIZ Lens) results. Maps the app's short
 * language codes to BCP-47 locales the OS speech engine understands.
 */
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

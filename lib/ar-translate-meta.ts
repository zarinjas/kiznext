/**
 * KIZ Lens — AR live translation languages (web copy).
 *
 * Mirrors `packages/shared/src/ar-translate-meta.ts` for the web app, which
 * does not import `@kiz/shared` (same precedent as `lib/direktori-meta.ts`).
 * Keep the two in sync when languages change.
 */

export interface ArLanguage {
  /** BCP-47 base code used by the AI prompt. */
  code: string
  /** Endonym — the language's own name, shown on the picker. */
  native: string
  /** English label. */
  english: string
  /** Locale tag for the browser's speech synthesis (read-aloud). */
  tts: string
}

export const AR_LANGUAGES: ArLanguage[] = [
  { code: "zh", native: "中文", english: "Chinese (Simplified)", tts: "zh-CN" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian", tts: "id-ID" },
  { code: "ar", native: "العربية", english: "Arabic", tts: "ar-SA" },
  { code: "ta", native: "தமிழ்", english: "Tamil", tts: "ta-IN" },
  { code: "bn", native: "বাংলা", english: "Bengali", tts: "bn-BD" },
  { code: "ja", native: "日本語", english: "Japanese", tts: "ja-JP" },
  { code: "th", native: "ไทย", english: "Thai", tts: "th-TH" },
  { code: "ur", native: "اردو", english: "Urdu", tts: "ur-PK" },
]

export const AR_LANGUAGE_CODES = AR_LANGUAGES.map((l) => l.code)

export function findArLanguage(code: string | null | undefined): ArLanguage | null {
  if (!code) return null
  return AR_LANGUAGES.find((l) => l.code === code) ?? null
}

export function arLanguageLabel(code: string | null | undefined): string {
  const lang = findArLanguage(code)
  return lang ? `${lang.native} · ${lang.english}` : code ?? ""
}

const SOURCE_LABELS: Record<string, string> = {
  ms: "Bahasa Melayu",
  en: "English",
  mixed: "Malay & English",
}

export function sourceLangLabel(code: string | null | undefined): string {
  if (!code) return ""
  return SOURCE_LABELS[code.toLowerCase()] ?? code
}

const NATIONALITY_TO_LANG: Record<string, string> = {
  CHINA: "zh",
  CHINESE: "zh",
  INDONESIA: "id",
  INDONEISA: "id",
  IRAQ: "ar",
  PALESTINE: "ar",
  PALESTIN: "ar",
  SUDAN: "ar",
  EGYPT: "ar",
  SOMALIA: "ar",
  SYRIA: "ar",
  YEMEN: "ar",
  JORDAN: "ar",
  "SAUDI ARABIA": "ar",
  INDIA: "ta",
  BANGLADESH: "bn",
  JAPAN: "ja",
  JEPUN: "ja",
  THAILAND: "th",
  PAKISTAN: "ur",
}

export function nationalityToLang(nationality: string | null | undefined): string | null {
  if (!nationality) return null
  const key = nationality.trim().toUpperCase()
  return NATIONALITY_TO_LANG[key] ?? null
}

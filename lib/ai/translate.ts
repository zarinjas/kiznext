import { getAiConfig } from "./config"
import { generateJson } from "./provider"
import { TRANSLATE_SYSTEM, buildTranslatePrompt, TRANSLATE_RESPONSE_SCHEMA } from "./prompts"

/**
 * Helpdesk live-chat translation. Residents write in Simplified Mandarin and
 * the KIZ office replies in English/Malay; every message is stored with both an
 * English and a Mandarin version so each side reads it in their own language.
 *
 * Uses the shared AI provider (Gemini or Ollama) — no extra dependency. Returns
 * `null` when AI is not configured or the call fails, so callers can fall back
 * to the untranslated message.
 */

export interface MessageTranslation {
  /** Detected language of the input: "zh" | "en" | "ms". */
  sourceLang: string
  /** English version of the message. */
  english: string
  /** Simplified Mandarin version of the message. */
  mandarin: string
}

interface TranslationJson {
  sourceLang?: string
  english?: string
  mandarin?: string
}

export async function translateMessage(text: string): Promise<MessageTranslation | null> {
  const body = (text ?? "").trim()
  if (!body) return null

  const cfg = await getAiConfig()
  if (!cfg.enabled) return null

  try {
    const result = await generateJson<TranslationJson>(cfg, {
      system: TRANSLATE_SYSTEM,
      prompt: buildTranslatePrompt(body),
      responseSchema: TRANSLATE_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 1200,
    })

    const english = result.english?.trim()
    const mandarin = result.mandarin?.trim()
    if (!english || !mandarin) return null

    return {
      sourceLang: (result.sourceLang?.trim() || "en").toLowerCase(),
      english,
      mandarin,
    }
  } catch {
    return null
  }
}

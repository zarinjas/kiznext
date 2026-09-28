import AsyncStorage from "@react-native-async-storage/async-storage"
import { createContext, useContext } from "react"

/**
 * Demo Mode — judging-day insurance.
 *
 * The AR features depend on a GPS fix, a magnetometer, OSM tiles and a reachable
 * backend. A competition judging room reliably has none of those: poor GPS
 * indoors, saturated shared wifi, and no time to debug. Demo Mode substitutes a
 * scripted GPS track and canned AI/AR payloads so the two flagship features can
 * always be demonstrated, indoors, offline, in under a minute.
 *
 * It is explicit and clearly labelled in-app (a "DEMO" pill is always visible
 * while active) — this is a presentation aid, never a way to fake a capability.
 */

const DEMO_KEY = "kiz.demo.enabled"

export async function isDemoEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(DEMO_KEY)) === "1"
}

export async function setDemoEnabled(on: boolean): Promise<void> {
  if (on) await AsyncStorage.setItem(DEMO_KEY, "1")
  else await AsyncStorage.removeItem(DEMO_KEY)
}

export interface DemoContextValue {
  demo: boolean
  setDemo: (on: boolean) => void
}

export const DemoContext = createContext<DemoContextValue>({ demo: false, setDemo: () => {} })

export function useDemo(): DemoContextValue {
  return useContext(DemoContext)
}

// ── Scripted AR walk ─────────────────────────────────────────────────────────

export interface DemoPoint {
  latitude: number
  longitude: number
}

/**
 * A ~180 m walking track across the KIZ grounds towards block K18A. Replayed on
 * a loop so the AR arrow, live distance, turn hint and route line all animate
 * convincingly while standing still in a judging room.
 */
export const DEMO_TRACK: DemoPoint[] = [
  { latitude: 2.92790, longitude: 101.78120 },
  { latitude: 2.92798, longitude: 101.78128 },
  { latitude: 2.92806, longitude: 101.78136 },
  { latitude: 2.92814, longitude: 101.78143 },
  { latitude: 2.92822, longitude: 101.78149 },
  { latitude: 2.92831, longitude: 101.78154 },
  { latitude: 2.92840, longitude: 101.78158 },
  { latitude: 2.92849, longitude: 101.78161 },
  { latitude: 2.92858, longitude: 101.78163 },
  { latitude: 2.92867, longitude: 101.78164 },
]

/** Where the scripted walk is heading. */
export const DEMO_DESTINATION: DemoPoint = { latitude: 2.92876, longitude: 101.78165 }

/**
 * Heading is synthesised from the track rather than the magnetometer, since
 * simulators and many tablets report no compass at all.
 */
export function demoHeadingAt(index: number): number {
  const a = DEMO_TRACK[index % DEMO_TRACK.length]
  const b = DEMO_TRACK[(index + 1) % DEMO_TRACK.length]
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  // Add a slow sway so the arrow visibly reacts, as a handheld phone would.
  const sway = Math.sin(index / 1.7) * 14
  return (((Math.atan2(y, x) * 180) / Math.PI + sway) % 360 + 360) % 360
}

// ── Canned KIZ Lens result ───────────────────────────────────────────────────

/**
 * A realistic OCR + translate payload for a Malay noticeboard, keyed by target
 * language. Boxes are normalised (0–1), matching the live API contract so the
 * overlay renderer needs no demo-specific branch.
 */
export const DEMO_LENS_BLOCKS: Record<string, { text: string; translation: string }[]> = {
  zh: [
    { text: "WAKTU PEJABAT", translation: "办公时间" },
    { text: "ISNIN - JUMAAT", translation: "星期一至星期五" },
    { text: "8:00 PAGI - 5:00 PETANG", translation: "上午8:00 - 下午5:00" },
    { text: "DILARANG MEROKOK", translation: "禁止吸烟" },
  ],
  en: [
    { text: "WAKTU PEJABAT", translation: "OFFICE HOURS" },
    { text: "ISNIN - JUMAAT", translation: "MONDAY - FRIDAY" },
    { text: "8:00 PAGI - 5:00 PETANG", translation: "8:00 AM - 5:00 PM" },
    { text: "DILARANG MEROKOK", translation: "NO SMOKING" },
  ],
  ar: [
    { text: "WAKTU PEJABAT", translation: "ساعات العمل" },
    { text: "ISNIN - JUMAAT", translation: "الاثنين - الجمعة" },
    { text: "8:00 PAGI - 5:00 PETANG", translation: "‏8:00 صباحًا - 5:00 مساءً" },
    { text: "DILARANG MEROKOK", translation: "ممنوع التدخين" },
  ],
}

const DEMO_LENS_BOXES = [
  { x: 0.12, y: 0.16, w: 0.62, h: 0.11 },
  { x: 0.12, y: 0.33, w: 0.52, h: 0.09 },
  { x: 0.12, y: 0.46, w: 0.70, h: 0.09 },
  { x: 0.12, y: 0.68, w: 0.55, h: 0.10 },
]

/** Build a demo Lens payload shaped exactly like the live API response. */
export function demoLensResult(targetLang: string) {
  const blocks = DEMO_LENS_BLOCKS[targetLang] ?? DEMO_LENS_BLOCKS.en
  return {
    sourceLang: "ms",
    blocks: blocks.map((b, i) => ({
      text: b.text,
      translation: b.translation,
      box: DEMO_LENS_BOXES[i] ?? DEMO_LENS_BOXES[DEMO_LENS_BOXES.length - 1],
    })),
  }
}

// ── Canned KIZ-AI answers ────────────────────────────────────────────────────

/** Starter prompts shown as chips on the KIZ-AI screen. */
export const AI_STARTERS: string[] = [
  "How do I pay my room fee?",
  "What time does the laundry close?",
  "How do I report a broken aircon?",
  "When can I choose my room?",
]

/** Keyword-matched fallback answers, used only in Demo Mode when offline. */
export const DEMO_AI_ANSWERS: { match: string[]; answer: string }[] = [
  {
    match: ["fee", "pay", "payment", "bayar"],
    answer:
      "Room fees are settled at the UKM Real Estate counter (Counter 2), not in the app. Bring your matric card. The fee plus a one-month deposit is due at check-in — your exact amount is shown on the Room Selection screen once the office publishes it.",
  },
  {
    match: ["laundry", "washer", "dobi"],
    answer:
      "The laundry room is open 7:00 AM – 11:00 PM daily. Machine status in the app is based on reminders residents set, so start a reminder when you load a machine — that's what tells everyone else it's busy.",
  },
  {
    match: ["aircon", "broken", "repair", "rosak", "maintenance"],
    answer:
      "Open Helpdesk and file a request under 'Maintenance & Repair'. Pick 'My room' as the location and your block and room are filled in automatically. The office sees it immediately during office hours.",
  },
  {
    match: ["room", "choose", "selection", "bilik"],
    answer:
      "Room Selection opens each semester and the closing date is shown at the top of that screen. You can pick Single, Twin-Sharing (enter your preferred roommate's matric number), or No Preference. Final placement is confirmed by the KIZ office.",
  },
]

export function demoAiAnswer(question: string): string {
  const q = question.toLowerCase()
  const hit = DEMO_AI_ANSWERS.find((entry) => entry.match.some((m) => q.includes(m)))
  return (
    hit?.answer ??
    "I can help with rooms, facilities, laundry, the helpdesk, check-in and payments at Kolej Ibu Zain. Try asking about one of those — or tap 'Ask the KIZ office' and a staff member will reply."
  )
}

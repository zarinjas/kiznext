/**
 * Room-selection domain logic: selection-window state, eligibility helpers,
 * eKolej CSV row mapping, and derived room/bed occupancy.
 *
 * Pure functions only — no Prisma access here so this stays testable and can be
 * imported from both server actions and client components. All time comparisons
 * run against Malaysia local time via nowMalaysia().
 */

import { nowMalaysia } from "./timezone"
export { nowMalaysia } from "./timezone"

// ── Selection window ────────────────────────────────────────────────────────

export type WindowState = "not_open" | "open" | "closing_soon" | "closed"

export interface WindowConfig {
  opensAt: Date
  closesAt: Date
  closingSoonHours: number
}

/** Resolve the current window state from config + now (Malaysia time). */
export function windowState(
  cfg: WindowConfig | null | undefined,
  now: Date = nowMalaysia(),
): WindowState {
  if (!cfg) return "not_open"
  const t = now.getTime()
  const open = cfg.opensAt.getTime()
  const close = cfg.closesAt.getTime()
  if (t < open) return "not_open"
  if (t >= close) return "closed"
  const soonMs = cfg.closingSoonHours * 60 * 60 * 1000
  if (t >= close - soonMs) return "closing_soon"
  return "open"
}

/** Can a student mutate their pick right now? */
export function canSelect(state: WindowState): boolean {
  return state === "open" || state === "closing_soon"
}

const WINDOW_TONE: Record<WindowState, "neutral" | "success" | "warning" | "danger"> = {
  not_open: "neutral",
  open: "success",
  closing_soon: "warning",
  closed: "danger",
}

export function windowTone(state: WindowState) {
  return WINDOW_TONE[state]
}

const WINDOW_LABEL: Record<WindowState, string> = {
  not_open: "Opening soon",
  open: "Open now",
  closing_soon: "Closing soon",
  closed: "Closed",
}

export function windowLabel(state: WindowState) {
  return WINDOW_LABEL[state]
}

// ── Seat / slot status ──────────────────────────────────────────────────────

export type SeatState =
  | "available"
  | "selected_me"
  | "partial"
  | "full"
  | "maintenance"
  | "closed"

/**
 * Derive a room's aggregate seat state for the grid, from the point of view of
 * the current student. `mineHere` = the student already holds a bed in this room.
 */
export function roomSeatState(args: {
  roomStatus: "available" | "maintenance" | "closed"
  windowState: WindowState
  totalBeds: number
  occupiedBeds: number
  mineHere: boolean
}): SeatState {
  const { roomStatus, windowState: ws, totalBeds, occupiedBeds, mineHere } = args
  if (mineHere) return "selected_me"
  if (roomStatus === "maintenance") return "maintenance"
  if (roomStatus === "closed" || ws === "closed" || ws === "not_open") {
    // still show real occupancy tint when nothing's actionable
    if (occupiedBeds >= totalBeds && totalBeds > 0) return "full"
    return "closed"
  }
  if (occupiedBeds === 0) return "available"
  if (occupiedBeds >= totalBeds) return "full"
  return "partial"
}

// ── eKolej CSV row mapping ──────────────────────────────────────────────────

export type Gender = "male" | "female"

export interface MappedStudent {
  matricId: string
  name: string
  gender: Gender
  faculty: string | null
  yearOfStudy: string | null
  religion: string | null
  race: string | null
  nationality: string
  currentCollege: string | null
  choice1: string | null
  applicationDate: Date | null
  applicationStatus: string | null
  isB40: boolean
  isOku: boolean
  isUniform: boolean
  merit: number | null
}

export type RowIssue =
  | { kind: "invalid"; reason: string }
  | { kind: "duplicate"; reason: string }
  | { kind: "ok" }

export interface MappedRow {
  raw: Record<string, string>
  mapped: MappedStudent | null
  issue: RowIssue
}

/** Column aliases — tolerant of small header variations in the export. */
const HEADER_ALIASES: Record<keyof MappedStudent | "bil", string[]> = {
  bil: ["Bil", "No", "#"],
  matricId: ["No. Matrik", "No Matrik", "Matrik", "No.Matrik"],
  name: ["Nama", "Name"],
  gender: ["Jantina", "Gender"],
  faculty: ["Fakulti", "Faculty"],
  yearOfStudy: ["Tahun Pengajian", "Tahun", "Year"],
  religion: ["Agama", "Religion"],
  race: ["Bangsa", "Race"],
  nationality: ["Warganegara", "Kewarganegaraan", "Nationality"],
  currentCollege: ["Kolej Semasa", "Kolej", "Current College"],
  choice1: ["Pilihan 1", "Pilihan1", "Pilihan"],
  applicationDate: ["Tarikh Permohonan", "Tarikh"],
  applicationStatus: ["Status Permohonan", "Status"],
  isB40: ["B40"],
  isOku: ["OKU"],
  isUniform: ["Uniform", "Unit Beruniform"],
  merit: ["Markah", "Merit", "Skor"],
}

function pick(row: Record<string, string>, key: keyof typeof HEADER_ALIASES): string {
  for (const alias of HEADER_ALIASES[key]) {
    if (row[alias] != null && row[alias] !== "") return row[alias]
    // case-insensitive fallback
    const hit = Object.keys(row).find((k) => k.toLowerCase() === alias.toLowerCase())
    if (hit && row[hit] !== "") return row[hit]
  }
  return ""
}

function parseGender(v: string): Gender | null {
  const s = v.trim().toLowerCase()
  if (["l", "lelaki", "male", "m"].includes(s)) return "male"
  if (["p", "perempuan", "female", "f", "w"].includes(s)) return "female"
  return null
}

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase()
  return ["ya", "yes", "y", "true", "1", "ada"].includes(s)
}

function parseDate(v: string): Date | null {
  const s = v.trim()
  if (!s) return null
  // Accept dd/mm/yyyy and dd-mm-yyyy in addition to ISO.
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Map + validate parsed CSV rows. Flags invalid rows (missing matric / bad
 * gender) and duplicate matric numbers (within the file). Duplicates against an
 * existing intake are detected by the caller, which knows the DB state.
 */
export function mapEkolejRows(rows: Record<string, string>[]): MappedRow[] {
  const seen = new Set<string>()

  return rows.map((raw) => {
    const matricId = pick(raw, "matricId").toUpperCase()
    const name = pick(raw, "name")
    const genderRaw = pick(raw, "gender")
    const gender = parseGender(genderRaw)

    if (!matricId) {
      return { raw, mapped: null, issue: { kind: "invalid", reason: "Missing matric number" } }
    }
    if (!name) {
      return { raw, mapped: null, issue: { kind: "invalid", reason: "Missing name" } }
    }
    if (!gender) {
      return {
        raw,
        mapped: null,
        issue: { kind: "invalid", reason: `Unrecognised gender "${genderRaw}"` },
      }
    }
    if (seen.has(matricId)) {
      return { raw, mapped: null, issue: { kind: "duplicate", reason: "Duplicate matric in file" } }
    }
    seen.add(matricId)

    const nationality = pick(raw, "nationality") || "Malaysia"
    const meritRaw = pick(raw, "merit")
    const merit = meritRaw ? Number(meritRaw.replace(",", ".")) : null

    const mapped: MappedStudent = {
      matricId,
      name,
      gender,
      faculty: pick(raw, "faculty") || null,
      yearOfStudy: pick(raw, "yearOfStudy") || null,
      religion: pick(raw, "religion") || null,
      race: pick(raw, "race") || null,
      nationality,
      currentCollege: pick(raw, "currentCollege") || null,
      choice1: pick(raw, "choice1") || null,
      applicationDate: parseDate(pick(raw, "applicationDate")),
      applicationStatus: pick(raw, "applicationStatus") || null,
      isB40: parseBool(pick(raw, "isB40")),
      isOku: parseBool(pick(raw, "isOku")),
      isUniform: parseBool(pick(raw, "isUniform")),
      merit: merit != null && !isNaN(merit) ? merit : null,
    }

    return { raw, mapped, issue: { kind: "ok" } }
  })
}

/** Short, privacy-safe display name: "Nurul Aisyah Rahman" → "Nurul A." */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`
}

/** Initials for an avatar. */
export function initials(full: string): string {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

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
import { roomCode } from "./bilik-format"

/**
 * Canonical matric normalisation: uppercase, and drop anything that isn't A–Z
 * or 0–9. eKolej sheet exports sometimes append footnote markers (e.g. an
 * international-student flag "A222765*") which would otherwise break matching
 * against user accounts, check-in records and later sheet syncs.
 */
export function cleanMatric(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase()
}

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
export type RoomType = "single" | "double"
export type RoomStatus = "available" | "maintenance" | "closed"

/**
 * Physical block → gender. The KIZ residence is single-gender per block, and the
 * accepted-list export carries no gender column, so a student's gender is
 * derived from the block they were placed in. Confirmed KIZ layout:
 *   K18A male · K18B/C/D female · K19A/B male · K19C/D female
 */
export const BLOCK_GENDER_MAP: Record<string, Gender> = {
  K18A: "male",
  K18B: "female",
  K18C: "female",
  K18D: "female",
  K19A: "male",
  K19B: "male",
  K19C: "female",
  K19D: "female",
}

export function blockGender(block: string | null | undefined): Gender | null {
  if (!block) return null
  return BLOCK_GENDER_MAP[block.trim().toUpperCase()] ?? null
}

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
  /** UKM Real Estate: "Mendaftar" = registered + deposit paid at the counter. */
  isRegistered: boolean
  /** Tenancy start from UKM RE (read-only in KIZ). */
  contractStart: Date | null
  /** Tenancy end from UKM RE (read-only in KIZ). */
  contractEnd: Date | null
  isB40: boolean
  isOku: boolean
  isUniform: boolean
  merit: number | null
}

export type RowIssue =
  | { kind: "invalid"; reason: string }
  | { kind: "duplicate"; reason: string }
  | { kind: "ok" }
  /** Flagged room row (damaged / reserve / staff) — carries no occupant. */
  | { kind: "room"; reason: string }
  /** Named but no matric — a non-student resident (Pengetua, mobility, staff). */
  | { kind: "occupant"; reason: string }
  /** Blank bed row — nothing to import. */
  | { kind: "empty" }

export interface MappedRow {
  raw: Record<string, string>
  mapped: MappedStudent | null
  issue: RowIssue
  /** Full canonical room code, e.g. "K18A-101". */
  roomCode: string | null
  /** Short room number within the block, e.g. "101". */
  roomNumber: string | null
  /** Block tag, e.g. "K18A". */
  block: string | null
  /** Single vs double, derived from the bed count in the file. */
  roomType: RoomType | null
  /** Room status, derived from a flagged row in the same room. */
  roomStatus: RoomStatus
  /** True when the room is damaged / reserved / staff. */
  flagged: boolean
}

/** Column aliases — tolerant of small header variations in the export. */
const HEADER_ALIASES: Record<keyof MappedStudent | "bil" | "block" | "room", string[]> = {
  bil: ["Bil", "No", "#"],
  block: ["BLOCK", "Blok", "Block"],
  matricId: ["No. Matrik", "No Matrik", "Matrik", "No.Matrik"],
  name: ["Nama", "Name"],
  gender: ["Jantina", "Gender"],
  faculty: ["Fakulti", "Faculty", "FAC"],
  yearOfStudy: ["Tahun Pengajian", "Tahun", "Year"],
  religion: ["Agama", "Religion"],
  race: ["Bangsa", "Race"],
  nationality: ["Warganegara", "Kewarganegaraan", "Nationality", "Country"],
  currentCollege: ["Kolej Semasa", "Kolej", "Current College"],
  choice1: ["Pilihan 1", "Pilihan1", "Pilihan"],
  applicationDate: ["Tarikh Permohonan", "Tarikh"],
  applicationStatus: ["Status Permohonan"],
  isRegistered: ["Status", "Mendaftar", "Registration"],
  contractStart: ["Tarikh Mula Kontrak", "Tarikh Mula", "Contract Start"],
  contractEnd: ["Tarikh Tamat Kontrak", "Tarikh Tamat", "Contract End"],
  isB40: ["B40"],
  isOku: ["OKU"],
  isUniform: ["Uniform", "Unit Beruniform"],
  merit: ["Markah", "Merit", "Skor"],
  room: ["No. Bilik", "No Bilik", "Nombor Bilik", "Bilik", "Room", "ROOM", "No. Bilik (K18A-101)"],
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

/**
 * UKM Real Estate registration status: "Mendaftar" means the student has been to
 * the counter, registered and paid the deposit. Anything negative ("belum",
 * "tidak", "not") is treated as not registered.
 */
function parseRegistered(v: string): boolean {
  const s = v.trim().toLowerCase()
  if (!s) return false
  if (/\b(belum|tidak|tak|not)\b/.test(s)) return false
  return s.includes("mendaftar") || ["ya", "yes", "y", "true", "1"].includes(s)
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

export interface SplitRoom {
  /** Block tag, e.g. "K18A". */
  block: string
  /** Numeric room tail, e.g. "101" (floor + 2-digit room). */
  number: string
}

/**
 * Split a room string from the CSV into block + numeric room. Accepts the
 * canonical code ("K18A-101"), a space or nothing as the separator ("K18A 101",
 * "K18A101"), and drops parenthetical bed hints ("K18A-101 (Bed A)"). Returns
 * null when there is no block or the tail isn't numeric — a bare "101" has no
 * block and is rejected so the importer can't guess the building.
 */
export function splitRoomCode(raw: string): SplitRoom | null {
  let s = (raw ?? "").trim().toUpperCase()
  if (!s) return null
  s = s.replace(/\s*\(.*\)\s*$/, "").trim()

  let block = ""
  let num = ""
  const dash = s.indexOf("-")
  const space = s.indexOf(" ")
  const sep =
    dash >= 0 && (space < 0 || dash < space)
      ? dash
      : space >= 0
        ? space
        : -1

  if (sep >= 0) {
    block = s.slice(0, sep).trim()
    num = s.slice(sep + 1).trim()
  } else {
    // No separator — the trailing run of ≥3 digits is the room number.
    const m = s.match(/^(.*?)(\d{3,})$/)
    if (m && m[1]) {
      block = m[1]
      num = m[2]
    } else {
      num = s
    }
  }

  if (!block || !/^[A-Z]/.test(block) || !/^\d{3,}$/.test(num)) return null
  return { block, number: num }
}

/** Room flag prefixes found in the NAME column (damaged / reserve / staff). */
function flagStatus(name: string): RoomStatus | null {
  const n = (name ?? "").trim().toUpperCase()
  if (!n) return null
  if (n.startsWith("ROSAK")) return "maintenance"
  if (n.startsWith("BILIK GANTIAN") || n.startsWith("KUARINTIN")) return "closed"
  if (n.startsWith("KEGUNAAN LAIN")) return "closed"
  return null
}

/**
 * Map + validate parsed CSV rows into per-row records, then run a grouping pass
 * that derives each room's type (single = 1 bed row, double = 2) and status
 * (from any flagged row in that room).
 *
 * Rows are one of four kinds:
 *  - `ok`        a student (has matric) → gets an EligibleStudent + a bed;
 *  - `room`      a flagged room row (ROSAK / BILIK GANTIAN / KEGUNAAN LAIN) —
 *                the room is created with a non-available status, no occupant;
 *  - `empty`     a blank bed row — skipped;
 *  - `invalid` / `duplicate` — skipped with a reason.
 *
 * Gender is read from a Jantina column when present, otherwise derived from the
 * block (BLOCK_GENDER_MAP).
 */
export function mapEkolejRows(rows: Record<string, string>[]): MappedRow[] {
  const seen = new Set<string>()

  const base: MappedRow[] = rows.map((raw) => {
    const blockRaw = pick(raw, "block").trim().toUpperCase()
    const roomRaw = pick(raw, "room").trim()
    const matricId = cleanMatric(pick(raw, "matricId"))
    const name = pick(raw, "name").trim()

    // Resolve the room code from either a "BLOCK" + "ROOM" pair or one full
    // "No. Bilik" column.
    let block: string | null = null
    let roomNumber: string | null = null
    let roomCodeValue: string | null = null
    let roomError: string | null = null
    if (blockRaw || roomRaw) {
      const combined = blockRaw && roomRaw ? `${blockRaw}-${roomRaw}` : roomRaw
      const split = splitRoomCode(combined)
      if (split) {
        block = split.block
        roomNumber = split.number
        roomCodeValue = roomCode(split.block, split.number)
      } else {
        roomError = `Unrecognised room "${combined}" — use a block code + number, e.g. K18A-101`
      }
    }

    const flag = flagStatus(name)

    // Blank bed row — nothing to import.
    if (!matricId && !name) {
      return { raw, mapped: null, issue: { kind: "empty" }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
    }
    // Flagged room row (damaged / reserve / staff) — no occupant.
    if (!matricId && flag) {
      return { raw, mapped: null, issue: { kind: "room", reason: name }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: flag, flagged: true }
    }
    // Named but no matric — a non-student resident (Pengetua, mobility, staff).
    if (!matricId) {
      return { raw, mapped: null, issue: { kind: "occupant", reason: name }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
    }
    if (!name) {
      return { raw, mapped: null, issue: { kind: "invalid", reason: "Missing name" }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
    }
    if (roomError) {
      return { raw, mapped: null, issue: { kind: "invalid", reason: roomError }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
    }

    const gender = parseGender(pick(raw, "gender")) ?? blockGender(block)
    if (!gender) {
      return { raw, mapped: null, issue: { kind: "invalid", reason: `Unknown block "${blockRaw || roomRaw || "?"}" — cannot determine gender` }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
    }
    if (seen.has(matricId)) {
      return { raw, mapped: null, issue: { kind: "duplicate", reason: "Duplicate matric in file" }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
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
      isRegistered: parseRegistered(pick(raw, "isRegistered")),
      contractStart: parseDate(pick(raw, "contractStart")),
      contractEnd: parseDate(pick(raw, "contractEnd")),
      isB40: parseBool(pick(raw, "isB40")),
      isOku: parseBool(pick(raw, "isOku")),
      isUniform: parseBool(pick(raw, "isUniform")),
      merit: merit != null && !isNaN(merit) ? merit : null,
    }

    return { raw, mapped, issue: { kind: "ok" }, roomCode: roomCodeValue, roomNumber, block, roomType: null, roomStatus: "available", flagged: false }
  })

  // Grouping pass — bed count per room decides single/double; a flagged row in
  // the room decides the status.
  const bedsByRoom = new Map<string, number>()
  const flagByRoom = new Map<string, RoomStatus>()
  for (const r of base) {
    if (!r.roomCode) continue
    bedsByRoom.set(r.roomCode, (bedsByRoom.get(r.roomCode) ?? 0) + 1)
    if (r.flagged && r.roomStatus !== "available") flagByRoom.set(r.roomCode, r.roomStatus)
  }
  for (const r of base) {
    if (!r.roomCode) continue
    r.roomType = (bedsByRoom.get(r.roomCode) ?? 0) <= 1 ? "single" : "double"
    const roomFlag = flagByRoom.get(r.roomCode)
    if (roomFlag) {
      r.roomStatus = roomFlag
      r.flagged = true
    }
  }
  return base
}

export interface GroupedRoom {
  code: string
  block: string
  number: string
  type: RoomType
  status: RoomStatus
  flagged: boolean
  /** Beds held by non-student residents (emergency / pengetua quota / staff). */
  reservedBeds: number
  students: MappedStudent[]
}

/**
 * Group mapped rows into rooms for creation + bed assignment. `students` only
 * holds valid, non-duplicate rows; flagged, occupant and empty rows still
 * contribute to the room's bed count (and therefore its single/double type).
 * `reservedBeds` counts rows held by non-student residents.
 */
export function groupMappedRooms(rows: MappedRow[]): GroupedRoom[] {
  const map = new Map<string, GroupedRoom>()
  for (const r of rows) {
    if (!r.roomCode || !r.block || !r.roomNumber) continue
    const existing = map.get(r.roomCode)
    const room: GroupedRoom = existing ?? {
      code: r.roomCode,
      block: r.block,
      number: r.roomNumber,
      type: r.roomType ?? "double",
      status: r.roomStatus,
      flagged: r.flagged,
      reservedBeds: 0,
      students: [],
    }
    room.type = r.roomType ?? room.type
    room.status = r.roomStatus
    room.flagged = room.flagged || r.flagged
    if (r.issue.kind === "ok" && r.mapped) room.students.push(r.mapped)
    if (r.issue.kind === "occupant") room.reservedBeds++
    map.set(r.roomCode, room)
  }
  return [...map.values()]
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

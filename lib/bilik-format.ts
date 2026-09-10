/**
 * Canonical room-code formatting for the residence (bilik) module.
 *
 * Single source of truth for how a room + bed is written everywhere in the app:
 *   - a room is stored in `residence_rooms.number` as its FULL code — e.g.
 *     "K18A-101" = block "K18A" · floor "1" · 2-digit room "01";
 *   - twin (double) rooms have two beds → "K18A-101 (Bed A)" / "K18A-101 (Bed B)";
 *   - single rooms keep just the room code → "K18A-301" (no bed suffix).
 *
 * `roomCode()` tolerates short inputs (e.g. "101") and normalises them to the
 * full form, so legacy rows and ad-hoc data never render as "K18A · K18A-101".
 *
 * Pure functions only — no Prisma access so this is safe to import from both
 * server components and client components.
 */

export type BedPositionLike = "single" | "left" | "right" | string | null | undefined

/** Map an internal bed position to its public letter. Single rooms have none. */
export function bedLabel(position: BedPositionLike): string | null {
  if (position === "left") return "A"
  if (position === "right") return "B"
  return null
}

/** Admin-facing bed word: "Bed A" / "Bed B", or plain "Bed" for a single room. */
export function bedWord(position: BedPositionLike): string {
  const letter = bedLabel(position)
  return letter ? `Bed ${letter}` : "Bed"
}

/**
 * Build the canonical room code from a block name + room number. Tolerates a
 * stored number that is already the full code ("K18A-101"), a short one
 * ("101"), or legacy junk without a block — as long as it has a block it is
 * prefixed onto.
 */
export function roomCode(blockName: string | null | undefined, number: string | null | undefined): string {
  const block = (blockName ?? "").trim().toUpperCase()
  const num = (number ?? "").trim().toUpperCase()
  if (!block) return num
  if (num.startsWith(`${block}-`)) return num
  if (!num) return block
  return `${block}-${num}`
}

export interface ParsedRoomNumber {
  /** Floor digit(s) before the trailing 2-digit room number. */
  floor: number
  /** The 2-digit room number. */
  room: string
}

/**
 * Split a canonical code into its floor + room number. Expects the full code
 * form ("K18A-101" → floor 1, room "01"). Returns null when the tail isn't a
 * numeric floor + 2-digit room (e.g. names like "Surau").
 */
export function parseRoomNumber(blockName: string | null | undefined, number: string | null | undefined): ParsedRoomNumber | null {
  const block = (blockName ?? "").trim().toUpperCase()
  const code = roomCode(block, number)
  const tail = block && code.startsWith(`${block}-`) ? code.slice(block.length + 1) : code
  if (!/^\d{3,}$/.test(tail)) return null
  const room = tail.slice(-2)
  const floor = Number(tail.slice(0, -2))
  if (!Number.isInteger(floor) || floor < 0) return null
  return { floor, room }
}

/**
 * The short room number inside a block ("101" from "K18A-101"), tolerating a
 * stored value that already carries no block prefix. Returns the raw input when
 * it can't be split. Used for the "Block K18A · Room 101" dashboard label.
 */
export function roomCodeShort(blockName: string | null | undefined, number: string | null | undefined): string {
  const block = (blockName ?? "").trim().toUpperCase()
  const code = roomCode(block, number)
  const tail = block && code.startsWith(`${block}-`) ? code.slice(block.length + 1) : code
  return tail || code
}

/**
 * The canonical, human-facing label for a room + bed:
 *   double: "K18A-101 (Bed A)" / "K18A-101 (Bed B)"
 *   single: "K18A-301"
 * Returns null when there is nothing to show.
 */
export function roomAssignmentLabel(input: {
  blockName: string | null | undefined
  number: string | null | undefined
  position?: BedPositionLike
}): string | null {
  const code = roomCode(input.blockName, input.number)
  if (!code) return null
  const letter = bedLabel(input.position)
  return letter ? `${code} (Bed ${letter})` : code
}

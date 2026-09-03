/**
 * Shared view-model types for the room-selection (bilik) module. These are the
 * serializable shapes that server actions return to client components — kept
 * separate from Prisma models so the client never imports the generated client.
 */

import type { SeatState } from "@/lib/theme"
import type { WindowState } from "@/lib/room-selection"

export type Gender = "male" | "female"
export type RoomType = "single" | "double"
export type RoomStatus = "available" | "maintenance" | "closed"
export type BedPosition = "single" | "left" | "right"

/** Privacy-safe occupant summary shown on a taken bed. */
export interface OccupantView {
  shortName: string
  /** null when privacy is `limited` and this isn't the current student. */
  matricId: string | null
  religion: string | null
  race: string | null
  nationality: string
  isMe: boolean
}

export interface BedView {
  id: string
  position: BedPosition
  occupant: OccupantView | null
}

export interface RoomView {
  id: string
  number: string
  floor: number
  type: RoomType
  status: RoomStatus
  beds: BedView[]
  /** Derived aggregate state from the current student's perspective. */
  seat: SeatState
}

export interface FloorView {
  floor: number
  rooms: RoomView[]
}

export interface BlockView {
  id: string
  name: string
  gender: Gender
  floors: FloorView[]
}

/** The student's current pick, if any. */
export interface MyPick {
  bedId: string
  roomId: string
  roomNumber: string
  blockName: string
  position: BedPosition
}

/** Full payload for the student picker. */
export interface PickerState {
  eligible: boolean
  windowState: WindowState
  window: {
    name: string
    opensAt: string
    closesAt: string
    closingSoonHours: number
  } | null
  blocks: BlockView[]
  myPick: MyPick | null
  /** Present when not eligible or closed-without-pick, to show the right empty state. */
  reason?: string
}

/** Live occupancy payload for the admin monitor. */
export interface OccupancySummary {
  totalBeds: number
  filled: number
  free: number
  maintenance: number
  notSelected: number
  occupancyPct: number
}

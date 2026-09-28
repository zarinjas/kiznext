/**
 * Laundry meta (shared twin of the web `lib/laundry-meta.ts`).
 *
 * There is no laundry-machine API, so a machine's "live" status is inferred from
 * the reminders residents set. This module is pure (no Prisma, no Next, no React)
 * so both apps can share the state vocabulary, cycle presets and derivation. The
 * DB reads live server-side (`lib/laundry.ts`).
 */

/**
 * The four states a machine card can show.
 * - `no_active`       — no reminder recorded
 * - `laundry_active`  — someone has a running timer
 * - `timer_ended`     — timer finished, still inside the grace window
 * - `out_of_service`  — admin closed the machine
 */
export type LaundryMachineState =
  | "no_active"
  | "laundry_active"
  | "timer_ended"
  | "out_of_service"

export type LaundryTone = "neutral" | "warning" | "danger"

export interface LaundryStateMeta {
  label: string
  tone: LaundryTone
  icon: string
}

export const LAUNDRY_STATE_META: Record<LaundryMachineState, LaundryStateMeta> = {
  no_active: { label: "No Active Reminder", tone: "neutral", icon: "radio_button_unchecked" },
  laundry_active: { label: "Active Reminder", tone: "warning", icon: "timer" },
  timer_ended: { label: "Timer Ended", tone: "neutral", icon: "timer_off" },
  out_of_service: { label: "Out of Service", tone: "danger", icon: "block" },
}

/** Preset cycle lengths (minutes) shown as quick-pick buttons. */
export const LAUNDRY_DURATIONS = [30, 45, 60] as const
export const LAUNDRY_DEFAULT_DURATION = 45
export const LAUNDRY_MIN_MINUTES = 15
export const LAUNDRY_MAX_MINUTES = 180

/** How long "Timer Ended" lingers before the machine resets to `no_active`. */
export const LAUNDRY_DEFAULT_GRACE_MINUTES = 30

/** States where a resident may start a new reminder. */
export const LAUNDRY_SELECTABLE_STATES: LaundryMachineState[] = ["no_active", "timer_ended"]

export function isValidDuration(minutes: number): boolean {
  return (
    Number.isFinite(minutes) &&
    Number.isInteger(minutes) &&
    minutes >= LAUNDRY_MIN_MINUTES &&
    minutes <= LAUNDRY_MAX_MINUTES
  )
}

export interface LaundryReminderInput {
  id: string
  machineId: string
  userId: string
  durationMinutes: number
  startedAt: Date | string
  endsAt: Date | string
  endedAt: Date | string | null
  endedReason?: string | null
}

/**
 * Derive a machine's state. `latest` must be the most recent (non-deleted)
 * reminder for the machine — ended or not.
 */
export function deriveMachineState(
  machine: { outOfService: boolean },
  latest: LaundryReminderInput | null,
  now: number,
  graceMs: number,
): LaundryMachineState {
  if (machine.outOfService) return "out_of_service"
  if (!latest) return "no_active"
  if (latest.endedAt) return "no_active"

  const endsAt = new Date(latest.endsAt).getTime()
  if (endsAt > now) return "laundry_active"
  if (now < endsAt + graceMs) return "timer_ended"
  return "no_active"
}

/** Human remaining label, e.g. "18 min left" / "45 sec left". */
export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0 min left"
  const minutes = Math.floor(ms / 60000)
  if (minutes >= 1) return `${minutes} min left`
  const seconds = Math.max(1, Math.ceil(ms / 1000))
  return `${seconds} sec left`
}

export interface LaundryMachineView {
  id: string
  name: string
  location: string | null
  imageUrl: string | null
  outOfService: boolean
  sortOrder: number
  state: LaundryMachineState
  /** Running/just-ended reminder on this machine (null when none). */
  reminder: {
    id: string
    userId: string
    userName: string
    durationMinutes: number
    startedAt: string
    endsAt: string
    mine: boolean
  } | null
}

export interface LaundryReminderView {
  id: string
  machineId: string
  machineName: string
  durationMinutes: number
  startedAt: string
  endsAt: string
  endedAt: string | null
  endedReason: string | null
}

export interface LaundrySnapshot {
  machines: LaundryMachineView[]
  myActive: LaundryReminderView | null
  myHistory: LaundryReminderView[]
  /** Shared fallback photo for machines that don't have their own. */
  defaultImageUrl: string | null
  graceMinutes: number
  /** Server clock (KL) so clients can correct for drift. */
  serverNow: string
}

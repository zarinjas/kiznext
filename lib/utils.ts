/**
 * Shared UI helpers. clsx/tailwind-merge were removed in the MUI migration —
 * this file now provides a minimal class join without external deps.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ")
}

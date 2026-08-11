"use client"

import { color } from "@/lib/theme"

/**
 * KIcon — Material Symbols Rounded wrapper.
 * `icon` is a symbol name (e.g. "inbox", "event_available", "qr_code_2").
 */
export function KIcon({
  icon,
  size = 20,
  color: c = "inherit",
  filled = false,
  weight = 500,
  sx,
  ...rest
}: {
  icon: string
  size?: number
  color?: string
  filled?: boolean
  weight?: number
  sx?: React.CSSProperties
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={`material-symbols-rounded${filled ? " filled" : ""}`}
      style={{
        fontSize: size,
        color: c === "inherit" ? "inherit" : c,
        fontVariationSettings: `"FILL" ${filled ? 1 : 0}, "wght" ${weight}, "GRAD" 0, "opsz" 24`,
        ...sx,
      }}
      {...rest}
    >
      {icon}
    </span>
  )
}

export type { color }

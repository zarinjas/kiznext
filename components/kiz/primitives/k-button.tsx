"use client"

import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import { KIcon } from "./icon"

/**
 * KButton — standard primary button with built-in loading state
 * and optional leading/trailing Material Symbol icon.
 */
export function KButton({
  loading = false,
  icon,
  iconEnd,
  children,
  variant = "contained",
  ...rest
}: {
  loading?: boolean
  icon?: string
  iconEnd?: string
  children?: React.ReactNode
  variant?: "contained" | "outlined" | "text"
} & Omit<React.ComponentProps<typeof Button>, "children">) {
  return (
    <Button variant={variant} disabled={rest.disabled || loading} {...rest}>
      {loading ? (
        <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
      ) : icon ? (
        <KIcon icon={icon} size={18} style={{ marginRight: 6 }} />
      ) : null}
      {children}
      {iconEnd && !loading && <KIcon icon={iconEnd} size={18} style={{ marginLeft: 6 }} />}
    </Button>
  )
}

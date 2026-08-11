"use client"

import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import { KIcon } from "./icon"
import { color } from "@/lib/theme"

/** KDialog — branded modal. `maxWidth` "xs" for confirmations, "sm"/"md" for forms. */
export function KDialog({
  open,
  onClose,
  title,
  icon,
  children,
  actions,
  maxWidth = "sm",
}: {
  open: boolean
  onClose: () => void
  title: string
  icon?: string
  children?: React.ReactNode
  actions?: React.ReactNode
  maxWidth?: "xs" | "sm" | "md"
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        {icon && (
          <span
            style={{
              display: "inline-flex",
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[50],
              color: color.brand[700],
            }}
          >
            <KIcon icon={icon} size={20} />
          </span>
        )}
        {title}
      </DialogTitle>
      {children && <DialogContent sx={{ pt: 0.5 }}>{children}</DialogContent>}
      {actions && (
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>{actions}</DialogActions>
      )}
    </Dialog>
  )
}

"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { KIcon } from "./icon"
import { radius } from "@/lib/theme"

/** KEmpty — designed empty state with icon, headline, body, optional CTA. */
export function KEmpty({
  icon = "inbox",
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon?: string
  title: string
  body?: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        justifyContent: "center",
        px: 3,
        py: compact ? 4 : 7,
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: compact ? 40 : 48,
          height: compact ? 40 : 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "action.hover",
          color: "text.disabled",
          mb: 2,
        }}
      >
        <KIcon icon={icon} size={compact ? 20 : 24} />
      </Box>
      <Typography sx={{ fontWeight: 600, color: "text.primary", letterSpacing: "-0.015em" }}>
        {title}
      </Typography>
      {body && (
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 320, mt: 0.5 }}>
          {body}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" size="small" onClick={onAction} sx={{ mt: 2.5 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

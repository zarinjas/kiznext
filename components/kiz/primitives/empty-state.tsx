"use client"

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import { KIcon } from "./icon"
import { color, elevation } from "@/lib/theme"

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
        borderRadius: 3,
        border: `1px dashed ${color.borderStrong}`,
        backgroundColor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: compact ? 40 : 56,
          height: compact ? 40 : 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color.brand[50],
          color: color.brand[700],
          mb: 2,
        }}
      >
        <KIcon icon={icon} size={compact ? 20 : 26} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: "text.primary" }}>
        {title}
      </Typography>
      {body && (
        <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 320, mt: 0.5 }}>
          {body}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="contained"
          size="small"
          onClick={onAction}
          sx={{ mt: 2.5, boxShadow: elevation.e2 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  )
}

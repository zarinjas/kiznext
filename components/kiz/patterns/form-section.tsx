"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { radius } from "@/lib/theme"

/** FormSection — grouped form block with a quiet header. */
export function FormSection({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string
  subtitle?: string
  icon?: string
  /** Optional right-aligned control (edit/delete buttons, etc.). */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Box
      sx={{
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        p: { xs: 2, sm: 2.75 },
        mb: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25, mb: 2.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          {icon && (
            <KIcon icon={icon} size={18} sx={{ color: "var(--mui-palette-text-secondary)" }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>{title}</Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  )
}

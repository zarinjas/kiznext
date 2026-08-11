"use client"

import Card from "@mui/material/Card"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, elevation } from "@/lib/theme"

/** FormSection — grouped form block with overline header. */
export function FormSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <Card
      sx={{
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevation.e1,
        p: { xs: 2.5, sm: 3 },
        mb: 2.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[50],
              color: color.brand[700],
            }}
          >
            <KIcon icon={icon} size={17} />
          </Box>
        )}
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Card>
  )
}

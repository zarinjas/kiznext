"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"

/** PageHeader — breadcrumb overline, Fraunces title, optional subtitle + actions. */
export function PageHeader({
  overline,
  title,
  subtitle,
  actions,
  animate = true,
}: {
  overline?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  animate?: boolean
}) {
  const content = (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "stretch", sm: "flex-end" },
        justifyContent: "space-between",
        flexDirection: { xs: "column", sm: "row" },
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        {overline && (
          <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
            {overline}
          </Typography>
        )}
        <Typography
          variant="h1"
          sx={{
            fontFamily: "var(--font-fraunces), serif",
            fontWeight: 560,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 520 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {actions}
        </Box>
      )}
    </Box>
  )

  if (!animate) return content
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {content}
    </motion.div>
  )
}

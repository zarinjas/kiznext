"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"

/**
 * PageHeader — deliberately compact so the fold stays dense.
 *
 * Mobile renders a tight large-title block (iOS style); desktop adds the
 * optional eyebrow and lets actions sit inline on the right.
 */
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
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 2.5 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {overline && (
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", display: { xs: "none", sm: "block" }, mb: 0.25 }}
          >
            {overline}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: { xs: 24, sm: 26 },
            fontWeight: 640,
            lineHeight: 1.15,
            letterSpacing: "-0.032em",
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 560 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
            width: { xs: "100%", sm: "auto" },
            flexShrink: 0,
            "& > *": { flex: { xs: "1 1 auto", sm: "0 0 auto" }, minWidth: { xs: 120, sm: "auto" } },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  )

  if (!animate) return content
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      {content}
    </motion.div>
  )
}

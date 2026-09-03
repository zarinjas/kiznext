"use client"

import Card from "@mui/material/Card"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

/** StatCard — minimal metric tile: label, big number, optional delta. */
export function StatCard({
  label,
  value,
  icon,
  tone,
  delta,
  onClick,
}: {
  label: string
  value: string | number
  icon?: string
  /** Kept for API compatibility; the visual language is now neutral. */
  tone?: "brand" | "accent" | "success" | "warning" | "danger" | "info"
  delta?: { value: number; positiveIsGood: boolean }
  onClick?: () => void
}) {
  void tone
  const positive = delta ? (delta.positiveIsGood ? delta.value >= 0 : delta.value <= 0) : null

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card
        onClick={onClick}
        sx={{
          cursor: onClick ? "pointer" : "default",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
          p: 2.25,
          height: "100%",
          transition: "border-color 160ms ease, background-color 160ms ease",
          "&:hover": { borderColor: color.borderStrong },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {icon && <KIcon icon={icon} size={16} sx={{ color: "var(--mui-palette-text-disabled)" }} />}
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {label}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontSize: 30,
            fontWeight: 620,
            mt: 1,
            lineHeight: 1.1,
            letterSpacing: "-0.032em",
          }}
        >
          {value}
        </Typography>

        {delta && positive !== null && (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              color: positive ? color.success.ink : color.danger.ink,
              fontWeight: 550,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            <KIcon icon={positive ? "arrow_upward" : "arrow_downward"} size={13} />
            {Math.abs(delta.value)}%{" "}
            <Box component="span" sx={{ color: "text.disabled", fontWeight: 450 }}>
              vs last week
            </Box>
          </Typography>
        )}
      </Card>
    </motion.div>
  )
}

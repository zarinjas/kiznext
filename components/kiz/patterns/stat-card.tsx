"use client"

import Card from "@mui/material/Card"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, elevation } from "@/lib/theme"

/** StatCard — value, label, delta + sparkline area. Premium analytics card. */
export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  delta,
  onClick,
}: {
  label: string
  value: string | number
  icon?: string
  tone?: "brand" | "success" | "warning" | "danger" | "info"
  delta?: { value: number; positiveIsGood: boolean }
  onClick?: () => void
}) {
  const toneMap = {
    brand: { bg: color.brand[50], fg: color.brand[700] },
    success: { bg: color.success.soft, fg: color.success.ink },
    warning: { bg: color.warning.soft, fg: color.warning.ink },
    danger: { bg: color.danger.soft, fg: color.danger.ink },
    info: { bg: color.info.soft, fg: color.info.ink },
  } as const
  const t = toneMap[tone]

  const positive = delta ? (delta.positiveIsGood ? delta.value >= 0 : delta.value <= 0) : null

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card
        onClick={onClick}
        sx={{
          cursor: onClick ? "pointer" : "default",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: elevation.e1,
          p: 2.5,
          transition: "box-shadow 200ms ease",
          "&:hover": onClick ? { boxShadow: elevation.e2 } : {},
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: t.bg,
                color: t.fg,
              }}
            >
              <KIcon icon={icon} size={18} />
            </Box>
          )}
        </Box>
        <Typography
          variant="h2"
          sx={{
            fontFamily: "var(--font-sans), sans-serif",
            fontWeight: 560,
            mt: 1,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </Typography>
        {delta && positive !== null && (
          <Typography
            variant="caption"
            sx={{
              color: positive ? color.success.ink : color.danger.ink,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.25,
            }}
          >
            <KIcon icon={positive ? "arrow_upward" : "arrow_downward"} size={13} />
            {Math.abs(delta.value)}%{" "}
            <Box component="span" sx={{ color: "text.disabled", fontWeight: 500 }}>
              vs last week
            </Box>
          </Typography>
        )}
      </Card>
    </motion.div>
  )
}

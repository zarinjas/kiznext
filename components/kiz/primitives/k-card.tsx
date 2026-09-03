"use client"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"
import { color } from "@/lib/theme"

/** KCard — hairline + e1 card; hover lifts to e2. Optional framer fade-in. */
export function KCard({
  children,
  hover = true,
  animate = false,
  onClick,
  sx,
  ...rest
}: {
  children: React.ReactNode
  hover?: boolean
  animate?: boolean
  onClick?: () => void
  sx?: object
} & Omit<React.ComponentProps<typeof Card>, "children">) {
  const card = (
    <Card
      {...rest}
      onClick={onClick}
      sx={{
        cursor: onClick ? "pointer" : "default",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "none",
        transition: "border-color 180ms ease, background-color 180ms ease",
        "&:hover": hover && onClick ? { borderColor: color.borderStrong } : {},
        ...sx,
      }}
    >
      <CardContent sx={{ p: "20px !important" }}>{children}</CardContent>
    </Card>
  )

  if (!animate) return card
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {card}
    </motion.div>
  )
}

export { Typography, Box }

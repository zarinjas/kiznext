"use client"

import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { motion } from "framer-motion"
import { markClaimed } from "./actions"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { radius } from "@/lib/theme"

interface Item {
  id: string
  itemName: string
  description: string
  photoUrl: string | null
  status: string
  locationFound: string | null
  createdAt: Date
  reportedBy: string
  reporter: { name: string }
}

interface Props {
  items: Item[]
  userId: string
  role: string
}

export function LostFoundList({ items, userId }: Props) {
  const router = useRouter()

  if (items.length === 0) {
    return <KEmpty icon="search" title="All clear!" body="Lost or found something? Report it above." />
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))" },
        gap: { xs: 1.25, sm: 1.5 },
      }}
    >
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3) }}
          style={{ height: "100%" }}
        >
          <Box
            sx={{
              height: "100%",
              borderRadius: `${radius.cardLg}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {item.photoUrl && (
              <Box
                component="img"
                src={item.photoUrl}
                alt={item.itemName}
                sx={{ width: "100%", aspectRatio: "16/10", objectFit: "cover" }}
              />
            )}

            <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <StatusChip status={item.status} />
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {item.createdAt.toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                </Typography>
              </Box>

              <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>
                {item.itemName}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {item.description}
              </Typography>

              {item.locationFound && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, color: "text.disabled" }}>
                  <KIcon icon="location_on" size={14} />
                  <Typography variant="caption">{item.locationFound}</Typography>
                </Box>
              )}

              <Box sx={{ flex: 1 }} />

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mt: 1.5 }}>
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {item.reporter.name}
                </Typography>
                {item.status === "found" && item.reportedBy === userId && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={async () => {
                      await markClaimed(item.id)
                      router.refresh()
                    }}
                  >
                    Claim
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  )
}

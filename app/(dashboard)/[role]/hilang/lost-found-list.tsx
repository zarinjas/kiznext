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
import { color } from "@/lib/theme"

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
    return (
      <KEmpty
        icon="search"
        title="No reports yet"
        body="Lost or found something? Report it above."
      />
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3) }}
        >
          <Box
            sx={{
              borderRadius: 2.5,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
              p: 2,
              display: "flex",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: item.status === "lost" ? color.danger.soft : color.success.soft,
                color: item.status === "lost" ? color.danger.ink : color.success.ink,
              }}
            >
              <KIcon icon={item.status === "lost" ? "visibility_off" : "search"} size={20} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {item.itemName}
                </Typography>
                <StatusChip status={item.status} />
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {item.description}
              </Typography>
              {item.locationFound && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, color: "text.secondary" }}>
                  <KIcon icon="location_on" size={14} />
                  <Typography variant="caption">Location: {item.locationFound}</Typography>
                </Box>
              )}
              <Typography variant="caption" sx={{ display: "block", color: "text.disabled", mt: 0.5 }}>
                {item.reporter.name} · {item.createdAt.toLocaleDateString("ms-MY")}
              </Typography>
              {item.photoUrl && (
                <Box component="img" src={item.photoUrl} alt={item.itemName} sx={{ mt: 1, maxHeight: 128, borderRadius: 1.5, objectFit: "cover" }} />
              )}
            </Box>

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
        </motion.div>
      ))}
    </Box>
  )
}

"use client"

import { useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"
import { BookingForm } from "./booking-form"
import { FilterBar } from "@/components/kiz/patterns/filter-bar"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, elevation } from "@/lib/theme"

interface Facility {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  block: { name: string }
  bookings: { timeSlotStart: Date; timeSlotEnd: Date }[]
}

interface Props {
  facilities: Facility[]
  role: string
  userId: string
}

export function FacilitiesList({ facilities, role }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = useMemo(
    () =>
      facilities.filter(
        (f) =>
          f.name.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase()) ||
          f.block.name.toLowerCase().includes(search.toLowerCase())
      ),
    [facilities, search]
  )

  if (selected) {
    const facility = facilities.find((f) => f.id === selected)
    if (!facility) return null
    return <BookingForm facility={facility} role={role} />
  }

  return (
    <Box>
      <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search facilities or blocks…" />

      {filtered.length === 0 ? (
        <KEmpty icon="meeting_room" title="No facilities found" body="Try a different search term." />
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          {filtered.map((f, i) => (
            <Grid key={f.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Card
                  onClick={() => setSelected(f.id)}
                  sx={{
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: "divider",
                    boxShadow: elevation.e1,
                    overflow: "hidden",
                    transition: "box-shadow 200ms ease, transform 200ms ease",
                    "&:hover": { boxShadow: elevation.e2, transform: "translateY(-2px)" },
                  }}
                >
                  {f.featuredImage ? (
                    <Box component="img" src={f.featuredImage} alt={f.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        aspectRatio: "16/9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: color.brand[50],
                        color: color.brand[700],
                      }}
                    >
                      <KIcon icon="meeting_room" size={36} />
                    </Box>
                  )}
                  <CardContent sx={{ p: "16px !important" }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.25 }}>
                      {f.description}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary" }}>
                        <KIcon icon="location_on" size={15} />
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>{f.block.name}</Typography>
                        {f.capacity ? (
                          <>
                            <Box component="span" sx={{ color: "divider" }}>•</Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                              <KIcon icon="group" size={14} />
                              <Typography variant="caption">{f.capacity}</Typography>
                            </Box>
                          </>
                        ) : null}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: f.price ? "primary.main" : "success.main" }}>
                        {f.price ? `RM ${f.price.toFixed(2)}` : "Free"}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

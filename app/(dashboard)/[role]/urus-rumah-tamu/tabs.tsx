"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"

/** Bookings / Guest Houses tab switcher for the admin guest house page. */
export function RumahTamuTabs({ role, tab }: { role: string; tab?: string }) {
  const value = tab === "guest-houses" ? "guest-houses" : "bookings"

  return (
    <Box sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
      <Tabs
        value={value}
        aria-label="Guest house admin sections"
        sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 550 } }}
      >
        <Tab
          component={Link}
          label="Bookings"
          value="bookings"
          href={`/${role}/urus-rumah-tamu`}
          sx={{ textDecoration: "none" }}
        />
        <Tab
          component={Link}
          label="Guest Houses"
          value="guest-houses"
          href={`/${role}/urus-rumah-tamu?tab=guest-houses`}
          sx={{ textDecoration: "none" }}
        />
      </Tabs>
    </Box>
  )
}

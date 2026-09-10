"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"

/** Facilities / Categories switcher for the admin facilities page. */
export function FacilityTabs({ role, tab }: { role: string; tab?: string }) {
  const value = tab === "categories" ? "categories" : "facilities"

  return (
    <Box sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
      <Tabs value={value} aria-label="Facility admin sections" sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 550 } }}>
        <Tab
          component={Link}
          label="Facilities"
          value="facilities"
          href={`/${role}/urus-fasiliti`}
          sx={{ textDecoration: "none" }}
        />
        <Tab
          component={Link}
          label="Categories"
          value="categories"
          href={`/${role}/urus-fasiliti?tab=categories`}
          sx={{ textDecoration: "none" }}
        />
      </Tabs>
    </Box>
  )
}

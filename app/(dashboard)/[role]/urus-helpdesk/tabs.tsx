"use client"

import Link from "next/link"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"

/** Live / Tickets tab switcher for the admin helpdesk inbox. */
export function HelpdeskTabs({ role, tab }: { role: string; tab?: string }) {
  const value = tab === "live" ? "live" : "tickets"

  return (
    <Box sx={{ mb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
      <Tabs
        value={value}
        aria-label="Helpdesk admin sections"
        sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 550 } }}
      >
        <Tab
          component={Link}
          label="Tickets"
          value="tickets"
          href={`/${role}/urus-helpdesk`}
          sx={{ textDecoration: "none" }}
        />
        <Tab
          component={Link}
          label="Live Chat"
          value="live"
          href={`/${role}/urus-helpdesk?tab=live`}
          sx={{ textDecoration: "none" }}
        />
      </Tabs>
    </Box>
  )
}

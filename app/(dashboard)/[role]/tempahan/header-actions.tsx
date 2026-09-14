"use client"

import Link from "next/link"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"

/**
 * Header actions for My Bookings. Lives in a client component so the
 * `component={Link}` buttons never cross the server→client boundary as props
 * (a function prop on an element passed to a client component can't be
 * serialized — it 500s the server render).
 */
export function MyBookingsHeaderActions({ role }: { role: string }) {
  return (
    <>
      <Button
        component={Link}
        href={`/${role}/tempahan-fasiliti`}
        variant="contained"
        startIcon={<KIcon icon="meeting_room" size={18} />}
      >
        Book a facility
      </Button>
      <Button
        component={Link}
        href={`/${role}/rumah-tamu`}
        variant="outlined"
        startIcon={<KIcon icon="hotel" size={18} />}
      >
        Guest house
      </Button>
    </>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { captureDestinationGps } from "@/lib/direktori"

type State = "idle" | "locating" | "error"

/**
 * For the backlog item "10 destinations still Unverified" — instead of the
 * admin long-pressing the spot in Google Maps and copy-pasting two numbers,
 * they stand at the real location, tap this, and the browser's own GPS
 * (same Geolocation API the AR arrow already uses) is saved straight to the
 * pin with `verified` turned on in one step.
 */
export function CaptureGpsButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")

  function handleCapture() {
    if (!navigator.geolocation) {
      setState("error")
      return
    }
    setState("locating")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await captureDestinationGps(id, pos.coords.latitude, pos.coords.longitude)
          setState("idle")
          router.refresh()
        } catch {
          setState("error")
        }
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={handleCapture}
      disabled={state === "locating"}
      startIcon={<KIcon icon={state === "error" ? "error" : "my_location"} size={15} />}
      title={`Stand at ${name} and tap to save your live GPS position here`}
      sx={state === "error" ? { color: "error.main", borderColor: "divider" } : undefined}
    >
      {state === "locating" ? "Locating…" : state === "error" ? "Failed, try again" : "Capture GPS here"}
    </Button>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import { saveSosSettings } from "@/lib/sos"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"

interface Props {
  initial: { officePhone: string; fellowPhone: string; fellowName: string }
}

export function SosSettingsForm({ initial }: Props) {
  const router = useRouter()
  const [officePhone, setOfficePhone] = useState(initial.officePhone)
  const [fellowPhone, setFellowPhone] = useState(initial.fellowPhone)
  const [fellowName, setFellowName] = useState(initial.fellowName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    let result
    try {
      result = await saveSosSettings({ officePhone, fellowPhone, fellowName })
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : "Couldn't save — try again." }
    } finally {
      setLoading(false)
    }

    if (result.success) {
      setSuccess("SOS routing saved! The button now dials the right number for the time of day.")
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save — try again.")
    }
  }

  return (
    <FormSection
      title="SOS Emergency Call"
      subtitle="The SOS button dials the office during office hours and the on-call fellow after hours. Leave a field blank to disable that number."
      icon="sos"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TextField
          id="sosOfficePhone"
          name="sosOfficePhone"
          label="Office number (office hours)"
          type="text"
          value={officePhone}
          onChange={(e) => setOfficePhone(e.target.value)}
          placeholder="03-8921 4000"
          helperText="Dialed Monday–Friday, 8:00 AM – 5:00 PM."
          fullWidth
        />
        <TextField
          id="sosFellowPhone"
          name="sosFellowPhone"
          label="Duty fellow number (after hours)"
          type="text"
          value={fellowPhone}
          onChange={(e) => setFellowPhone(e.target.value)}
          placeholder="012-345 6789"
          helperText="Dialed outside office hours, weekends and public holidays."
          fullWidth
        />
        <TextField
          id="sosFellowName"
          name="sosFellowName"
          label="Fellow label (optional)"
          type="text"
          value={fellowName}
          onChange={(e) => setFellowName(e.target.value)}
          placeholder="Duty Fellow (on-call)"
          helperText="Shown on the SOS screen. Defaults to 'Duty Fellow (on-call)'."
          fullWidth
        />

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? undefined : <KIcon icon="save" size={16} />}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </Box>
      </form>
    </FormSection>
  )
}

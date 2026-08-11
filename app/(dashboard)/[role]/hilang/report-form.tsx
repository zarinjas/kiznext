"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"

import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
import { reportItem } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"

interface Props {
  role: string
}

export function ReportForm({ role: _role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    try {
      await reportItem(form)
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="status" name="status" label="Type" select required defaultValue="lost">
          <MenuItem value="lost">Lost Item</MenuItem>
          <MenuItem value="found">I Found an Item</MenuItem>
        </TextField>
        <TextField id="itemName" name="itemName" label="Item Name" placeholder="e.g. Black wallet" required />
        <TextField
          id="description"
          name="description"
          label="Description"
          placeholder="Describe the item…"
          multiline
          minRows={3}
          required
        />
        <TextField id="locationFound" name="locationFound" label="Location (optional)" placeholder="e.g. KIZ canteen" />
        <TextField
          id="photo"
          name="photo"
          label="Photo (optional)"
          type="file"
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { accept: "image/*" } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <KButton type="submit" loading={loading} icon="add_alert">
          {loading ? "Submitting…" : "Report"}
        </KButton>
      </Box>
    </form>
  )
}

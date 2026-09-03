"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import { markArrived } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"

export function ParcelForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    try {
      await markArrived(form.get("matricId") as string, form.get("description") as string)
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oops, something slipped — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="matricId" name="matricId" label="Student Matric No." placeholder="A123456" required />
        <TextField id="description" name="description" label="Description (optional)" placeholder="e.g. Books, clothes" />
        {error && <Alert severity="error">{error}</Alert>}
        <KButton type="submit" loading={loading} icon="inventory_2" sx={{ width: "fit-content" }}>
          {loading ? "Saving…" : "Register"}
        </KButton>
      </Box>
    </form>
  )
}

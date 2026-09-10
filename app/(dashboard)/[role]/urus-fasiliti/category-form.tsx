"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import { createFacilityCategory, updateFacilityCategory } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import type { FacilitySection } from "@/app/generated/prisma/client"

interface Props {
  sections: FacilitySection[]
  onClose?: () => void
  initial?: { id: string; name: string; section: FacilitySection; sortOrder: number }
  /** When creating, propose a sensible next sortOrder for each section. */
  nextSort?: (section: FacilitySection) => number
}

export function CategoryForm({ sections, onClose, initial, nextSort }: Props) {
  const router = useRouter()
  const [section, setSection] = useState<FacilitySection>(initial?.section ?? sections[0])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const defaultSort = initial ? initial.sortOrder : (nextSort ? nextSort(section) : 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const data = {
      name: (form.get("name") as string).trim(),
      section,
      sortOrder: form.get("sortOrder") ? parseInt(form.get("sortOrder") as string, 10) : defaultSort,
    }

    try {
      if (initial) {
        await updateFacilityCategory(initial.id, data)
      } else {
        await createFacilityCategory(data)
      }
      router.refresh()
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the category.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField id="name" name="name" label="Category Name" required defaultValue={initial?.name} placeholder="e.g. Event & Meeting Spaces" />

        <TextField
          id="section"
          name="section"
          label="Directory Section"
          select
          value={section}
          onChange={(e) => setSection(e.target.value as FacilitySection)}
        >
          {sections.map((s) => (
            <MenuItem key={s} value={s}>
              {s === "bookable" ? "Bookable Facilities" : "Shared Facilities"}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          key={`${initial?.id ?? "new"}-${section}`}
          id="sortOrder"
          name="sortOrder"
          label="Display Order"
          type="number"
          slotProps={{ htmlInput: { min: 1 } }}
          defaultValue={defaultSort}
          placeholder="1"
          helperText="Lower numbers appear first within the section."
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={onClose ?? (() => router.back())} disabled={loading} variant="outlined">
            Cancel
          </Button>
          <KButton type="submit" loading={loading} icon={initial ? "save" : "add"}>
            {loading ? "Saving…" : initial ? "Save Changes" : "Add Category"}
          </KButton>
        </Box>
      </Box>
    </form>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import { deleteFacilityCategory } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { CategoryForm } from "./category-form"
import { FACILITY_SECTION_META } from "@/lib/facility-meta"
import { color } from "@/lib/theme"
import type { FacilitySection } from "@/app/generated/prisma/client"

export interface CategoryItem {
  id: string
  name: string
  section: FacilitySection
  sortOrder: number
  facilityCount: number
}

interface Props {
  categories: CategoryItem[]
  role: string
}

export function CategoryAdmin({ categories }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CategoryItem | null>(null)
  const [deleting, setDeleting] = useState<CategoryItem | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const sections: FacilitySection[] = ["bookable", "shared"]
  const grouped = sections.map((section) => ({
    section,
    items: categories.filter((c) => c.section === section),
  }))

  async function handleDelete() {
    if (!deleting) return
    setLoading(true)
    setError("")
    try {
      await deleteFacilityCategory(deleting.id)
      setDeleting(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete that category.")
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {categories.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="category"
            title="No facility categories yet"
            body="Add a category such as 'Event & Meeting Spaces' or 'Resident Services' to group facilities."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Category
          </Button>
        </Box>
      ) : (
        <>
          {grouped.map(({ section, items }) => {
            const meta = FACILITY_SECTION_META[section]
            if (items.length === 0) return null
            return (
              <ListGroup
                key={section}
                title={meta.title}
                action={
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setShowAdd(true)}
                    startIcon={<KIcon icon="add" size={17} />}
                  >
                    Add
                  </Button>
                }
              >
                {items.map((c) => (
                  <ListRow
                    key={c.id}
                    icon={meta.icon}
                    title={c.name}
                    subtitle={`${c.facilityCount} ${c.facilityCount === 1 ? "facility" : "facilities"}`}
                    trailing={
                      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                        <StatusChip status={c.section} tone={meta.tone} />
                        <Button size="small" variant="outlined" onClick={() => setEditing(c)} startIcon={<KIcon icon="edit" size={15} />}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setError("")
                            setDeleting(c)
                          }}
                          startIcon={<KIcon icon="delete" size={15} />}
                          sx={{ color: "error.main", borderColor: "divider" }}
                        >
                          Delete
                        </Button>
                      </Box>
                    }
                  />
                ))}
              </ListGroup>
            )
          })}
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add Category
            </Button>
          </Box>
        </>
      )}

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Category" icon="category">
        <CategoryForm
          sections={sections}
          onClose={() => setShowAdd(false)}
          nextSort={(section) => categories.filter((c) => c.section === section).reduce((m, c) => Math.max(m, c.sortOrder + 1), 1)}
        />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.name}`} icon="edit">
          <CategoryForm
            sections={sections}
            onClose={() => setEditing(null)}
            initial={{
              id: editing.id,
              name: editing.name,
              section: editing.section,
              sortOrder: editing.sortOrder,
            }}
          />
        </KDialog>
      )}

      <KDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete Category"
        icon="warning"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setDeleting(null)} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading || (deleting?.facilityCount ?? 0) > 0}
              variant="contained"
              sx={{ backgroundColor: color.danger.main, "&:hover": { backgroundColor: color.danger.ink } }}
            >
              {loading ? "Deleting…" : "Yes, Delete"}
            </Button>
          </>
        }
      >
        {deleting && (deleting.facilityCount ?? 0) > 0 ? (
          <Alert severity="error" sx={{ m: 0 }}>
            {deleting.name} still has {deleting.facilityCount} {deleting.facilityCount === 1 ? "facility" : "facilities"}{" "}
            assigned. Move or delete them first.
          </Alert>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary", m: 0 }}>
            Are you sure you want to delete <strong>{deleting?.name}</strong>? Facilities won&apos;t be removed, but this
            grouping will disappear.
          </Typography>
        )}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </KDialog>
    </Box>
  )
}

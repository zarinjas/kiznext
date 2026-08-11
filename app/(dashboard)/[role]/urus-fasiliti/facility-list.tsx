"use client"

import { useState, useMemo } from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import { DeleteButton } from "./delete-button"
import { FacilityForm } from "./facility-form"
import { FilterBar } from "@/components/kiz/patterns/filter-bar"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { color, elevation } from "@/lib/theme"

interface FacilityItem {
  id: string
  name: string
  blockName: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  timeSlotDuration: number | null
  maxPerDay: number | null
  requiresApproval: boolean
}

interface BlockOption {
  id: string
  name: string
}

interface Props {
  facilities: FacilityItem[]
  blocks: BlockOption[]
  role: string
}

function formatPrice(price: number | null): string {
  if (price == null) return "Free"
  return `RM ${price.toFixed(2)}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hrs`
}

export function FacilityList({ facilities, blocks, role }: Props) {
  const [search, setSearch] = useState("")
  const [blockFilter, setBlockFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      const matchSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
      const matchBlock = blockFilter === "all" || f.blockName === blockFilter
      return matchSearch && matchBlock
    })
  }, [facilities, search, blockFilter])

  const editingFacility = editingId ? facilities.find((f) => f.id === editingId) ?? null : null

  const blockNames = useMemo(() => [...new Set(facilities.map((f) => f.blockName))], [facilities])

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search facilities…" />
        </Box>
        <TextField
          select
          size="small"
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All Blocks</MenuItem>
          {blockNames.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => setShowForm(true)} startIcon={<KIcon icon="add" size={17} />}>
          Add Facility
        </Button>
      </Box>

      {filtered.length === 0 ? (
        <KEmpty
          icon="apartment"
          title={search || blockFilter !== "all" ? "No facilities match your search" : "No facilities yet"}
          body={search || blockFilter !== "all" ? undefined : "Click 'Add Facility' to get started."}
        />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((facility) => (
            <Grid key={facility.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  boxShadow: elevation.e1,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {facility.featuredImage ? (
                  <Box component="img" src={facility.featuredImage} alt={facility.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
                ) : (
                  <Box sx={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: color.brand[50], color: color.brand[700] }}>
                    <KIcon icon="apartment" size={36} />
                  </Box>
                )}
                <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {facility.name}
                    </Typography>
                    <Box
                      component="span"
                      sx={{ fontSize: 11, fontWeight: 600, color: color.brand[700], backgroundColor: color.brand[50], borderRadius: 999, px: 1, py: 0.25, flexShrink: 0 }}
                    >
                      {facility.blockName}
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {facility.description}
                  </Typography>

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, my: 1.5, fontSize: 12.5, color: "text.secondary" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <KIcon icon="payments" size={14} /> {formatPrice(facility.price)}
                    </Box>
                    {facility.capacity && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <KIcon icon="group" size={14} /> {facility.capacity} pax
                      </Box>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <KIcon icon="schedule" size={14} /> {formatDuration(facility.timeSlotDuration)}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <KIcon icon="event_repeat" size={14} /> {facility.maxPerDay ?? 3}/day
                    </Box>
                  </Box>

                  <Box sx={{ mt: "auto" }}>
                    <StatusChip
                      status={facility.requiresApproval ? "pending" : "approved"}
                    />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setEditingId(facility.id)} startIcon={<KIcon icon="edit" size={15} />}>
                      Edit
                    </Button>
                    <DeleteButton facilityId={facility.id} facilityName={facility.name} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add / Edit modals */}
      <KDialog open={showForm} onClose={() => setShowForm(false)} title="Add New Facility" icon="add_business">
        <FacilityForm role={role} blocks={blocks} onClose={() => setShowForm(false)} />
      </KDialog>

      {editingFacility && (
        <KDialog
          open
          onClose={() => setEditingId(null)}
          title={`Edit Facility: ${editingFacility.name}`}
          icon="edit"
        >
          <FacilityForm
            role={role}
            blocks={blocks}
            onClose={() => setEditingId(null)}
            initialData={{
              id: editingFacility.id,
              name: editingFacility.name,
              blockId: blocks.find((b) => b.name === editingFacility.blockName)?.id ?? "",
              description: editingFacility.description,
              featuredImage: editingFacility.featuredImage,
              gallery: editingFacility.gallery,
              price: editingFacility.price,
              capacity: editingFacility.capacity,
              timeSlotDuration: editingFacility.timeSlotDuration,
              maxPerDay: editingFacility.maxPerDay,
              requiresApproval: editingFacility.requiresApproval,
            }}
          />
        </KDialog>
      )}
    </Box>
  )
}

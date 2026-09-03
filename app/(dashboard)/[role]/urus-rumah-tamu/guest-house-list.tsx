"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { GuestHouseForm } from "./guest-house-form"
import { DeleteGuestHouseButton } from "./delete-guest-house-button"
import { FilterBar } from "@/components/kiz/patterns/filter-bar"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { color, radius } from "@/lib/theme"

interface GuestHouseItem {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  maxDays: number | null
  requiresApproval: boolean
}

interface Props {
  guestHouses: GuestHouseItem[]
}

function formatPrice(price: number | null): string {
  if (price == null) return "Free"
  return `RM ${price.toFixed(2)}`
}

export function GuestHouseList({ guestHouses }: Props) {
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = guestHouses.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()),
  )

  const editing = editingId ? guestHouses.find((g) => g.id === editingId) ?? null : null

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2.5, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search guest houses…" />
        </Box>
        <Button variant="contained" onClick={() => setShowForm(true)} startIcon={<KIcon icon="add" size={17} />}>
          Add Guest House
        </Button>
      </Box>

      {filtered.length === 0 ? (
        <KEmpty
          icon="hotel"
          title={search ? "No guest houses match your search" : "No guest houses yet"}
          body={search ? undefined : "Click 'Add Guest House' to get started."}
        />
      ) : (
        <Grid container spacing={2}>
          {filtered.map((g) => (
            <Grid key={g.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box
                sx={{
                  borderRadius: `${radius.cardLg}px`,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  boxShadow: "none",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                {g.featuredImage ? (
                  <Box component="img" src={g.featuredImage} alt={g.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
                ) : (
                  <Box sx={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: color.brand[50], color: color.brand[700] }}>
                    <KIcon icon="hotel" size={36} />
                  </Box>
                )}
                <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography variant="h5" sx={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.description}
                  </Typography>

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, my: 1.5, fontSize: 12.5, color: "text.secondary" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                      <KIcon icon="payments" size={14} sx={{ flexShrink: 0 }} />
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatPrice(g.price)}</Box>
                    </Box>
                    {g.capacity && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                        <KIcon icon="group" size={14} sx={{ flexShrink: 0 }} />
                        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.capacity} pax</Box>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                      <KIcon icon="schedule" size={14} sx={{ flexShrink: 0 }} />
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.maxDays ? `${g.maxDays} day max` : "No limit"}</Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                      <KIcon icon="photo_library" size={14} sx={{ flexShrink: 0 }} />
                      <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.gallery.length} photo{g.gallery.length === 1 ? "" : "s"}</Box>
                    </Box>
                  </Box>

                  <Box sx={{ mt: "auto" }}>
                    <StatusChip status={g.requiresApproval ? "pending" : "approved"} />
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setEditingId(g.id)} startIcon={<KIcon icon="edit" size={15} />}>
                      Edit
                    </Button>
                    <DeleteGuestHouseButton guestHouseId={g.id} guestHouseName={g.name} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <KDialog open={showForm} onClose={() => setShowForm(false)} title="Add New Guest House" icon="add_business">
        <GuestHouseForm onClose={() => setShowForm(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditingId(null)} title={`Edit: ${editing.name}`} icon="edit">
          <GuestHouseForm
            onClose={() => setEditingId(null)}
            initialData={{
              id: editing.id,
              name: editing.name,
              description: editing.description,
              featuredImage: editing.featuredImage,
              gallery: editing.gallery,
              price: editing.price,
              capacity: editing.capacity,
              maxDays: editing.maxDays,
              requiresApproval: editing.requiresApproval,
            }}
          />
        </KDialog>
      )}
    </Box>
  )
}

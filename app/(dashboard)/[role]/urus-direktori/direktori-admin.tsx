"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { DestinationForm } from "./destination-form"
import { DeleteDestinationButton } from "./delete-destination-button"
import { TYPE_LABELS, TYPE_TONES } from "@/lib/direktori-meta"
import type { DestinationType } from "@/app/generated/prisma/client"
import { font, color } from "@/lib/theme"

interface DestinationView {
  id: string
  name: string
  type: DestinationType
  icon: string
  latitude: number
  longitude: number
  indoor: boolean
  building: string | null
  description: string | null
  sortOrder: number
  verified: boolean
}

interface Props {
  destinations: DestinationView[]
}

function TypeTag({ type }: { type: DestinationType }) {
  const tone = TYPE_TONES[type]
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.375,
        borderRadius: 999,
        backgroundColor: tone.soft,
        color: tone.ink,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      {TYPE_LABELS[type]}
    </Box>
  )
}

export function DirektoriAdmin({ destinations }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<DestinationView | null>(null)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {destinations.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="view_in_ar"
            title="No destinations yet"
            body="Add a destination pin to get started — students will be able to point their camera at it."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Destination
          </Button>
        </Box>
      ) : (
        <ListGroup
          title={`${destinations.length} destination${destinations.length === 1 ? "" : "s"}`}
          action={
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add
            </Button>
          }
        >
          {destinations.map((d) => (
            <ListRow
              key={d.id}
              icon={d.icon}
              title={d.name}
              subtitle={
                <Box component="span" sx={{ fontFamily: font.mono, fontSize: 12 }}>
                  {d.latitude.toFixed(5)}, {d.longitude.toFixed(5)}
                  {d.building ? ` · ${d.building}` : ""}
                </Box>
              }
              trailing={
                <>
                  <TypeTag type={d.type} />
                  {!d.verified && (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.375,
                        borderRadius: 999,
                        backgroundColor: color.warning.soft,
                        color: color.warning.ink,
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        lineHeight: 1.5,
                      }}
                    >
                      <KIcon icon="warning" size={13} />
                      Unverified
                    </Box>
                  )}
                  {d.indoor && (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        px: 1,
                        py: 0.375,
                        borderRadius: 999,
                        backgroundColor: color.accent[100],
                        color: color.accent[700],
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        lineHeight: 1.5,
                      }}
                    >
                      <KIcon icon="meeting_room" size={13} />
                      Indoor
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Button size="small" variant="outlined" onClick={() => setEditing(d)} startIcon={<KIcon icon="edit" size={15} />}>
                      Edit
                    </Button>
                    <DeleteDestinationButton id={d.id} name={d.name} />
                  </Box>
                </>
              }
            />
          ))}
        </ListGroup>
      )}

      {destinations.some((d) => !d.verified) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            p: 1.5,
            borderRadius: `${8}px`,
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
            fontSize: 12.5,
          }}
        >
          <KIcon icon="warning" size={16} sx={{ flexShrink: 0, marginTop: 0.25 }} />
          <Box>
            {destinations.filter((d) => !d.verified).length} pin
            {destinations.filter((d) => !d.verified).length === 1 ? "" : "s"} marked{" "}
            <strong>Unverified</strong>. Their coordinates were estimated, not surveyed. Confirm
            each one on a real device or against Google Maps (“What’s here?”) and switch on
            “GPS verified” when editing.
          </Box>
        </Box>
      )}

      {destinations.length > 0 && !destinations.some((d) => d.indoor) && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Tip: mark rooms inside the admin building as <strong>Indoor</strong> so students know GPS accuracy
          is coarser there.
        </Typography>
      )}

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Destination" icon="view_in_ar">
        <DestinationForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog
          open
          onClose={() => setEditing(null)}
          title={`Edit Destination: ${editing.name}`}
          icon="edit"
        >
          <DestinationForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}
    </Box>
  )
}

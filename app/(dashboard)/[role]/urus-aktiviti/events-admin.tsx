"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { EventForm } from "./event-form"
import { DeleteEventButton } from "./delete-event-button"
import { color } from "@/lib/theme"

interface EventView {
  id: string
  title: string
  description: string | null
  venue: string | null
  startsAt: string
  displayWhen: string
}

interface Props {
  events: EventView[]
}

export function EventsAdmin({ events }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<EventView | null>(null)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {events.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="event"
            title="No upcoming activities"
            body="Add an activity to show it in the “Upcoming at KIZ” widget on student and staff dashboards."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Activity
          </Button>
        </Box>
      ) : (
        <ListGroup
          title={`${events.length} upcoming${events.length === 1 ? "" : ""}`}
          action={
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add
            </Button>
          }
        >
          {events.map((e) => (
            <ListRow
              key={e.id}
              icon="event"
              title={e.title}
              subtitle={
                <Box component="span">
                  {e.venue ? `${e.venue} · ` : ""}
                  {e.description ? e.description : ""}
                </Box>
              }
              meta={e.displayWhen}
              trailing={
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  <Button size="small" variant="outlined" onClick={() => setEditing(e)} startIcon={<KIcon icon="edit" size={15} />}>
                    Edit
                  </Button>
                  <DeleteEventButton id={e.id} name={e.title} />
                </Box>
              }
            />
          ))}
        </ListGroup>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          p: 1.75,
          borderRadius: 2,
          backgroundColor: color.info.soft,
          color: color.info.ink,
          fontSize: 13,
        }}
      >
        <KIcon icon="info" size={17} sx={{ flexShrink: 0, marginTop: 1 }} />
        <Box>
          Past activities drop off automatically. Up to three upcoming ones appear on the dashboard.
        </Box>
      </Box>

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Activity" icon="event">
        <EventForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.title}`} icon="edit">
          <EventForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}
    </Box>
  )
}

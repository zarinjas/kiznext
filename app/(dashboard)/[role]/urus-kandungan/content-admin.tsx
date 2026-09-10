"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { ContentForm } from "./content-form"
import { DeleteContentButton } from "./delete-content-button"
import { CONTENT_KIND_META } from "@/lib/content-meta"
import type { ContentKind } from "@/app/generated/prisma/client"
import { color } from "@/lib/theme"

interface ContentItemView {
  id: string
  kind: ContentKind
  title: string
  subtitle: string | null
  body: string | null
  phone: string | null
  link: string | null
  sortOrder: number
}

interface Props {
  items: ContentItemView[]
}

function KindTag({ kind }: { kind: ContentKind }) {
  const meta = CONTENT_KIND_META[kind]
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
        backgroundColor: color.brand[50],
        color: color.brand[800],
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      <KIcon icon={meta.icon} size={13} />
      {meta.label}
    </Box>
  )
}

export function ContentAdmin({ items }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ContentItemView | null>(null)

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {items.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="widgets"
            title="No dashboard content yet"
            body="Add emergency contacts or a Life at KIZ living-guide card to fill the member dashboard widgets."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Add Content
          </Button>
        </Box>
      ) : (
        <ListGroup
          title={`${items.length} item${items.length === 1 ? "" : "s"}`}
          action={
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Add
            </Button>
          }
        >
          {items.map((c) => (
            <ListRow
              key={c.id}
              icon={CONTENT_KIND_META[c.kind].icon}
              title={c.title}
              subtitle={
                <Box component="span">
                  {c.kind === "emergency_contact" ? c.phone ?? c.subtitle : c.subtitle ?? c.link}
                </Box>
              }
              meta={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <KindTag kind={c.kind} />
                </Box>
              }
              trailing={
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  <Button size="small" variant="outlined" onClick={() => setEditing(c)} startIcon={<KIcon icon="edit" size={15} />}>
                    Edit
                  </Button>
                  <DeleteContentButton id={c.id} name={c.title} />
                </Box>
              }
            />
          ))}
        </ListGroup>
      )}

      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        Widgets only render when they have content. Remove every emergency contact and the widget hides itself.
      </Typography>

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Content" icon="widgets">
        <ContentForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.title}`} icon="edit">
          <ContentForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}
    </Box>
  )
}

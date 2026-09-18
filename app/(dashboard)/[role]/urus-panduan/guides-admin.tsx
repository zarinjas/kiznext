"use client"

import { useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { color } from "@/lib/theme"
import { GUIDE_CATEGORIES, GUIDE_CATEGORY_META, guideCategoryMeta } from "@/lib/guide-meta"
import type { GuideCategory } from "@/app/generated/prisma/client"
import { GuideForm } from "./guide-form"
import { DeleteGuideButton } from "./delete-guide-button"

export interface GuideView {
  id: string
  title: string
  description: string | null
  category: GuideCategory
  fileUrl: string
  fileSize: number | null
  coverImage: string | null
  pageCount: number | null
  published: boolean
  isPinned: boolean
  sortOrder: number
  displayDate: string
  sizeLabel: string | null
}

export function GuidesAdmin({ guides }: { guides: GuideView[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<GuideView | null>(null)
  const [filter, setFilter] = useState<"all" | GuideCategory>("all")

  const filtered = useMemo(
    () => (filter === "all" ? guides : guides.filter((g) => g.category === filter)),
    [guides, filter]
  )

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {guides.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <KEmpty
            icon="menu_book"
            title="No guides yet"
            body="Upload a PDF to start the resident library — orientation, rules, or a programme handbook."
          />
          <Button variant="contained" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
            Upload Guide
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Tabs
              value={filter}
              onChange={(_, v) => setFilter(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 38, "& .MuiTab-root": { minHeight: 38, textTransform: "none", fontSize: 13.5 } }}
            >
              <Tab value="all" label={`All (${guides.length})`} />
              {GUIDE_CATEGORIES.map((c) => {
                const count = guides.filter((g) => g.category === c).length
                return <Tab key={c} value={c} label={`${GUIDE_CATEGORY_META[c].label} (${count})`} />
              })}
            </Tabs>
            <Button variant="contained" size="small" onClick={() => setShowAdd(true)} startIcon={<KIcon icon="add" size={17} />}>
              Upload
            </Button>
          </Box>

          {filtered.length === 0 ? (
            <KEmpty compact icon="filter_alt_off" title="Nothing in this category" body="Try another filter." />
          ) : (
            <ListGroup>
              {filtered.map((g) => {
                const meta = guideCategoryMeta(g.category)
                const bits = [g.sizeLabel, g.pageCount ? `${g.pageCount} pages` : null, g.displayDate].filter(Boolean)
                return (
                  <ListRow
                    key={g.id}
                    iconNode={
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: meta.tone.soft,
                          color: meta.tone.ink,
                        }}
                      >
                        <KIcon icon={meta.icon} size={20} />
                      </Box>
                    }
                    title={
                      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        {g.isPinned && <KIcon icon="push_pin" size={15} sx={{ color: color.warning.main }} />}
                        {g.title}
                      </Box>
                    }
                    subtitle={g.description || `${meta.label} · ${bits.join(" · ")}`}
                    meta={
                      !g.published ? (
                        <Box
                          component="span"
                          sx={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: color.ink[700],
                            backgroundColor: color.neutral.soft,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 999,
                          }}
                        >
                          Draft
                        </Box>
                      ) : undefined
                    }
                    trailing={
                      <Box sx={{ display: "flex", gap: 0.75 }}>
                        <Button size="small" variant="outlined" component="a" href={g.fileUrl} target="_blank" rel="noreferrer" startIcon={<KIcon icon="visibility" size={15} />}>
                          View
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => setEditing(g)} startIcon={<KIcon icon="edit" size={15} />}>
                          Edit
                        </Button>
                        <DeleteGuideButton id={g.id} name={g.title} />
                      </Box>
                    }
                  />
                )
              })}
            </ListGroup>
          )}
        </>
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
          PDFs are stored on the server. Unpublishing hides a guide from residents without deleting it; deleting removes it from the library but keeps an audit trail.
        </Box>
      </Box>

      <KDialog open={showAdd} onClose={() => setShowAdd(false)} title="Upload Guide" icon="upload_file">
        <GuideForm onClose={() => setShowAdd(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.title}`} icon="edit" maxWidth="md">
          <GuideForm initial={editing} onClose={() => setEditing(null)} />
        </KDialog>
      )}
    </Box>
  )
}

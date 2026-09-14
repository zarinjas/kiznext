"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import Switch from "@mui/material/Switch"
import FormControlLabel from "@mui/material/FormControlLabel"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { Surface } from "@/components/kiz/primitives/list-group"
import { color, radius } from "@/lib/theme"
import {
  createFaq,
  updateFaq,
  deleteFaq,
  importFaqsFile,
  exportFaqsCsv,
  seedStarterFaqs,
} from "@/lib/ai/faq-actions"
import { FAQ_CATEGORIES } from "@/lib/ai/faq-seed"
import { buildFaqTemplateXlsx } from "@/lib/ai/faq-template"
import type { UnansweredRow } from "@/lib/ai/types"

export interface FaqRow {
  id: string
  category: string
  question: string
  answer: string
  keywords: string | null
  published: boolean
}

interface Draft {
  id?: string
  category: string
  question: string
  answer: string
  keywords: string
  published: boolean
}

const EMPTY_DRAFT: Draft = { category: FAQ_CATEGORIES[0], question: "", answer: "", keywords: "", published: true }

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" })
  downloadBlob(filename, blob)
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function FaqAdmin({ faqs, unanswered }: { faqs: FaqRow[]; unanswered: UnansweredRow[] }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [catFilter, setCatFilter] = useState("all")

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<FaqRow | null>(null)

  const [pendingImport, setPendingImport] = useState<{ name: string; file: File } | null>(null)
  const [importing, setImporting] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faqs.filter((f) => {
      if (catFilter !== "all" && f.category !== catFilter) return false
      if (!q) return true
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
    })
  }, [faqs, query, catFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, FaqRow[]>()
    for (const f of filtered) {
      const list = map.get(f.category) ?? []
      list.push(f)
      map.set(f.category, list)
    }
    return Array.from(map.entries())
  }, [filtered])

  const answeredCount = faqs.filter((f) => f.answer.trim().length > 0).length
  const publishedCount = faqs.filter((f) => f.published && f.answer.trim()).length

  function openAdd(prefill?: Partial<Draft>) {
    setError("")
    setSuccess("")
    setDraft({ ...EMPTY_DRAFT, ...prefill })
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.question.trim()) {
      setError("Question is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        category: draft.category,
        question: draft.question,
        answer: draft.answer,
        keywords: draft.keywords,
        published: draft.published,
      }
      const result = draft.id ? await updateFaq(draft.id, payload) : await createFaq(payload)
      if (result.success) {
        setDraft(null)
        setSuccess("Saved. Re-index on the KIZ-AI page to make it live.")
        router.refresh()
      } else {
        setError(result.error ?? "Couldn't save.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setBusy(true)
    await deleteFaq(confirmDelete.id)
    setConfirmDelete(null)
    setBusy(false)
    router.refresh()
  }

  async function togglePublished(f: FaqRow) {
    await updateFaq(f.id, {
      category: f.category,
      question: f.question,
      answer: f.answer,
      keywords: f.keywords ?? "",
      published: !f.published,
    })
    router.refresh()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingImport({ name: file.name, file })
    if (fileRef.current) fileRef.current.value = ""
  }

  async function confirmImport() {
    if (!pendingImport) return
    setImporting(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("file", pendingImport.file)
      const result = await importFaqsFile(fd)
      if (result.success) {
        setSuccess(`Imported: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped. Re-index to make them live.`)
        setPendingImport(null)
        router.refresh()
      } else {
        setError(result.error ?? "Import failed.")
      }
    } finally {
      setImporting(false)
    }
  }

  async function handleTemplate() {
    setError("")
    setSuccess("")
    setBusy(true)
    try {
      downloadBlob("kiz-faq-template.xlsx", buildFaqTemplateXlsx())
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    setBusy(true)
    try {
      download("kiz-faq.csv", await exportFaqsCsv())
    } finally {
      setBusy(false)
    }
  }

  async function handleSeed() {
    setBusy(true)
    setError("")
    try {
      const result = await seedStarterFaqs()
      setSuccess(`Added ${result.added} starter question${result.added === 1 ? "" : "s"} as drafts. Fill in the answers, then re-index.`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Stats */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {[
          { label: "Questions", value: faqs.length, icon: "quiz" },
          { label: "Answered", value: answeredCount, icon: "edit_note" },
          { label: "Live (published)", value: publishedCount, icon: "public" },
        ].map((s) => (
          <Surface key={s.label} sx={{ px: 2, py: 1.25, display: "flex", alignItems: "center", gap: 1.25, flex: "1 1 140px" }}>
            <KIcon icon={s.icon} size={18} sx={{ color: color.brand[600] }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.1 }}>{s.value}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {s.label}
              </Typography>
            </Box>
          </Surface>
        ))}
      </Box>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search questions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: "1 1 220px", minWidth: 180 }}
        />
        <TextField size="small" select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} sx={{ minWidth: 190 }}>
          <MenuItem value="all">All categories</MenuItem>
          {FAQ_CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={() => openAdd()} startIcon={<KIcon icon="add" size={16} />} sx={{ textTransform: "none" }}>
          Add question
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" variant="outlined" onClick={() => fileRef.current?.click()} startIcon={<KIcon icon="upload_file" size={15} />} sx={{ textTransform: "none" }}>
          Import CSV
        </Button>
        <Button size="small" variant="outlined" onClick={handleTemplate} disabled={busy} startIcon={<KIcon icon="download" size={15} />} sx={{ textTransform: "none" }}>
          Download template (Excel)
        </Button>
        <Button size="small" variant="outlined" onClick={handleExport} disabled={busy} startIcon={<KIcon icon="description" size={15} />} sx={{ textTransform: "none" }}>
          Export
        </Button>
        <Button size="small" onClick={handleSeed} disabled={busy} startIcon={<KIcon icon="auto_awesome" size={15} />} sx={{ textTransform: "none", color: color.brand[700] }}>
          Add starter questions
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={handleFile}
        />
      </Box>

      <Typography variant="caption" sx={{ color: "text.disabled" }}>
        Download the Excel template — it has a “Panduan” sheet (Malay instructions + examples) and a “FAQ” sheet to fill in. Add questions there, save, then upload the file (Excel or CSV). Rows match on the question text, so re-importing updates answers instead of duplicating.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}

      {/* List */}
      {filtered.length === 0 ? (
        <KEmpty
          icon="quiz"
          title={faqs.length === 0 ? "No questions yet" : "No matches"}
          body={faqs.length === 0 ? "Add a question, import a CSV, or start from the template." : "Try a different search or category."}
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {grouped.map(([category, items]) => (
            <Box key={category}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1, px: 0.5 }}>
                {category} · {items.length}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {items.map((f) => (
                  <Surface key={f.id} sx={{ p: 1.75 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: 14.5, lineHeight: 1.4 }}>{f.question}</Typography>
                        {f.answer.trim() ? (
                          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {f.answer}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: color.warning.ink, mt: 0.5, display: "inline-block" }}>
                            Needs an answer
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                        <Box
                          component="button"
                          aria-label={f.published ? "Unpublish" : "Publish"}
                          onClick={() => togglePublished(f)}
                          sx={{
                            px: 1,
                            py: 0.375,
                            borderRadius: 999,
                            border: "1px solid",
                            borderColor: f.published ? color.success.main : "divider",
                            backgroundColor: f.published ? color.success.soft : "transparent",
                            color: f.published ? color.success.ink : "text.disabled",
                            fontSize: 11,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          {!f.published ? "Draft" : f.answer.trim() ? "Live" : "No answer"}
                        </Box>
                        <Box component="button" aria-label="Edit" onClick={() => openAdd({ id: f.id, category: f.category, question: f.question, answer: f.answer, keywords: f.keywords ?? "", published: f.published })} sx={{ border: "none", background: "transparent", cursor: "pointer", color: "text.secondary", display: "flex", p: 0.5 }}>
                          <KIcon icon="edit" size={17} />
                        </Box>
                        <Box component="button" aria-label="Delete" onClick={() => setConfirmDelete(f)} sx={{ border: "none", background: "transparent", cursor: "pointer", color: color.danger.main, display: "flex", p: 0.5 }}>
                          <KIcon icon="delete" size={17} />
                        </Box>
                      </Box>
                    </Box>
                  </Surface>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Unanswered */}
      {unanswered.length > 0 && (
        <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Questions residents asked that KIZ-AI couldn&apos;t answer
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Turn these into FAQs — that&apos;s how the assistant keeps improving.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {unanswered.map((u) => (
              <Box key={u.question} sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1.25, py: 1, borderRadius: `${radius.input}px`, backgroundColor: "action.hover" }}>
                <Box sx={{ minWidth: 26, height: 22, px: 0.75, borderRadius: 999, backgroundColor: color.warning.soft, color: color.warning.ink, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {u.count}
                </Box>
                <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.question}
                </Typography>
                <Button size="small" onClick={() => openAdd({ question: u.question, category: "General & Contact" })} sx={{ textTransform: "none" }}>
                  Add FAQ
                </Button>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Add / edit dialog */}
      <KDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit FAQ" : "Add FAQ"}
        icon="quiz"
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setDraft(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {draft && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              select
              label="Category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              fullWidth
            >
              {FAQ_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Question"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              placeholder="e.g. What is the check-in procedure at KIZ?"
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Answer"
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              placeholder="Write the official answer residents should get."
              multiline
              minRows={4}
              fullWidth
            />
            <TextField
              label="Keywords (optional)"
              value={draft.keywords}
              onChange={(e) => setDraft({ ...draft, keywords: e.target.value })}
              helperText="Alternate phrasings or Malay/Chinese terms to improve matching, comma-separated."
              fullWidth
            />
            <FormControlLabel
              control={<Switch checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />}
              label="Published (use in KIZ-AI answers)"
            />
          </Box>
        )}
      </KDialog>

      {/* Delete confirm */}
      <KDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this FAQ?"
        icon="delete"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={handleDelete} disabled={busy} sx={{ textTransform: "none" }}>
              Delete
            </Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary">
          “{confirmDelete?.question}” will be removed from the knowledge base after the next re-index.
        </Typography>
      </KDialog>

      {/* Import confirm */}
      <KDialog
        open={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Import FAQs?"
        icon="upload_file"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setPendingImport(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={confirmImport} disabled={importing} sx={{ textTransform: "none" }}>
              {importing ? "Importing…" : "Import"}
            </Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary">
          {pendingImport?.name}. Rows matching an existing question are updated; new questions are added. After importing, run Re-index to make them live.
        </Typography>
      </KDialog>
    </Box>
  )
}

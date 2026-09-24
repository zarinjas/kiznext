"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Switch from "@mui/material/Switch"
import Chip from "@mui/material/Chip"
import FormControlLabel from "@mui/material/FormControlLabel"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { FormSection, FormGrid } from "@/components/kiz/patterns/form-section"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import {
  deleteCafeItem,
  extractCafeMenuFromImage,
  saveCafeConfig,
  saveCafeItems,
  uploadCafeMenuImage,
  type CafeItemInput,
} from "@/lib/cafe"
import {
  CAFE_CATEGORIES,
  DIETARY_TAGS,
  WEEKDAYS,
  buildOrderMessage,
  cafeStatus,
  formatRM,
  type CafeConfig,
  type CafeDayHours,
  type CafeItemView,
  type CafeWeekday,
} from "@/lib/cafe-meta"
import { color, font, radius } from "@/lib/theme"

interface Props {
  config: CafeConfig
  items: CafeItemView[]
  aiEnabled: boolean
}

type DraftItem = CafeItemInput & { id?: string; key: string }

function toDraft(i: CafeItemView): DraftItem {
  return {
    key: i.id,
    id: i.id,
    name: i.name,
    price: i.price,
    category: i.category,
    description: i.description,
    dietary: i.dietary,
    isAvailable: i.isAvailable,
    published: i.published,
  }
}

export function CafeAdmin({ config, items, aiEnabled }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Settings ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState<CafeConfig>(config)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [newClosedDate, setNewClosedDate] = useState("")

  // ── Menu ───────────────────────────────────────────────────────────────────
  const [menuImage, setMenuImage] = useState<string | null>(config.menuImage)
  const [draft, setDraft] = useState<DraftItem[]>(items.map(toDraft))
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [savingMenu, setSavingMenu] = useState(false)
  const [menuMsg, setMenuMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (patch: Partial<CafeConfig>) => setForm((f) => ({ ...f, ...patch }))

  function setDay(key: CafeWeekday, patch: Partial<CafeDayHours>) {
    setForm((f) => ({ ...f, schedule: { ...f.schedule, [key]: { ...f.schedule[key], ...patch } } }))
  }

  function addClosedDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    setForm((f) => ({ ...f, closedDates: Array.from(new Set([...f.closedDates, date])).sort() }))
  }

  function removeClosedDate(date: string) {
    setForm((f) => ({ ...f, closedDates: f.closedDates.filter((d) => d !== date) }))
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    setSettingsMsg(null)
    const res = await saveCafeConfig(form)
    setSettingsMsg(res.success ? { ok: true, text: "Cafe settings saved." } : { ok: false, text: res.error ?? "Couldn't save." })
    setSavingSettings(false)
    if (res.success) router.refresh()
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setMenuMsg(null)
    const fd = new FormData()
    fd.append("image", file)
    const res = await uploadCafeMenuImage(fd)
    if (res.success && res.url) {
      setMenuImage(res.url)
      setMenuMsg({ ok: true, text: "Menu photo uploaded." })
    } else {
      setMenuMsg({ ok: false, text: res.error ?? "Upload failed." })
    }
    setUploading(false)
  }

  async function handleExtract() {
    if (!menuImage) return
    setExtracting(true)
    setMenuMsg(null)
    const res = await extractCafeMenuFromImage(menuImage)
    if (res.success && res.items) {
      const added: DraftItem[] = res.items.map((i, idx) => ({
        key: `ai-${Date.now()}-${idx}`,
        name: i.name,
        price: i.price,
        category: i.category,
        description: i.description,
        dietary: i.dietary,
        isAvailable: true,
        published: false,
      }))
      setDraft((d) => [...d, ...added])
      setMenuMsg({ ok: true, text: `KIZ-AI read ${added.length} item${added.length === 1 ? "" : "s"} — review them below, then Save.` })
    } else {
      setMenuMsg({ ok: false, text: res.error ?? "Couldn't read the menu." })
    }
    setExtracting(false)
  }

  function addManual() {
    setDraft((d) => [
      ...d,
      { key: `new-${Date.now()}`, name: "", price: 0, category: CAFE_CATEGORIES[0], description: null, dietary: [], isAvailable: true, published: true },
    ])
  }

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setDraft((d) => d.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  async function removeItem(item: DraftItem) {
    if (item.id) {
      const res = await deleteCafeItem(item.id)
      if (!res.success) {
        setMenuMsg({ ok: false, text: res.error ?? "Couldn't remove that item." })
        return
      }
    }
    setDraft((d) => d.filter((i) => i.key !== item.key))
  }

  async function handleSaveMenu() {
    setSavingMenu(true)
    setMenuMsg(null)
    const res = await saveCafeItems(
      draft
        .filter((i) => i.name.trim())
        .map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          category: i.category,
          description: i.description,
          dietary: i.dietary,
          isAvailable: i.isAvailable,
          published: i.published,
        })),
    )
    setMenuMsg(res.success ? { ok: true, text: "Menu saved." } : { ok: false, text: res.error ?? "Couldn't save." })
    setSavingMenu(false)
    if (res.success) router.refresh()
  }

  const publishedCount = draft.filter((i) => i.published && i.name.trim()).length
  const previewMessage = buildOrderMessage({
    cafeName: form.name || "KIZ Cafe",
    refCode: "KIZ-CAFE-0001",
    customerName: "Ali bin Abu",
    matricId: "A222765",
    lines: draft
      .filter((i) => i.name.trim())
      .slice(0, 2)
      .map((i) => ({ itemId: i.key, name: i.name, price: Number(i.price) || 0, qty: 1 })),
    subtotal: draft
      .filter((i) => i.name.trim())
      .slice(0, 2)
      .reduce((s, i) => s + (Number(i.price) || 0), 0),
    pickupTime: "12:45 PM",
    note: "kurang pedas",
  })

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* ── Settings ─────────────────────────────────────────────────────── */}
      <FormSection title="Cafe details" subtitle="Shown to students and used for the WhatsApp hand-off." icon="storefront">
        <FormGrid columns={2}>
          <TextField label="Cafe name" value={form.name} onChange={(e) => set({ name: e.target.value })} size="medium" required />
          <TextField
            label="WhatsApp number"
            value={form.phone}
            onChange={(e) => set({ phone: e.target.value })}
            size="medium"
            required
            placeholder="e.g. 0123456789"
            helperText="Malaysian number — stored as 60XXXXXXXXX for wa.me"
          />
          <TextField label="Location" value={form.location} onChange={(e) => set({ location: e.target.value })} size="medium" />
          <TextField
            label="Tagline"
            value={form.tagline}
            onChange={(e) => set({ tagline: e.target.value })}
            size="medium"
            helperText="One line shown on the student dashboard highlight."
          />
        </FormGrid>
        <FormControlLabel
          sx={{ mt: 1.5 }}
          control={<Switch checked={form.active} onChange={(e) => set({ active: e.target.checked })} />}
          label="Accepting orders (master switch)"
        />
      </FormSection>

      {/* ── Opening hours ────────────────────────────────────────────────── */}
      <FormSection
        title="Opening hours"
        subtitle="Ordering only opens inside these hours. Change them any time — mornings, evenings, or closed."
        icon="schedule"
      >
        <Box sx={{ mb: 1.75 }}>
          <StatusPreview config={form} />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {WEEKDAYS.map(({ key, label }) => {
            const day = form.schedule[key]
            return (
              <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", py: 0.5 }}>
                <Box sx={{ width: 92, fontSize: 13.5, fontWeight: 600 }}>{label}</Box>
                <FormControlLabel
                  sx={{ mr: 0.5 }}
                  control={
                    <Switch
                      size="small"
                      checked={!day.closed}
                      onChange={(e) => setDay(key, { closed: !e.target.checked })}
                    />
                  }
                  label={<Typography variant="caption" sx={{ width: 46, display: "inline-block" }}>{day.closed ? "Closed" : "Open"}</Typography>}
                />
                <TextField
                  type="time"
                  size="small"
                  value={day.open}
                  disabled={day.closed}
                  onChange={(e) => setDay(key, { open: e.target.value })}
                  sx={{ width: 132 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Typography variant="caption" sx={{ color: "text.disabled" }}>to</Typography>
                <TextField
                  type="time"
                  size="small"
                  value={day.close}
                  disabled={day.closed}
                  onChange={(e) => setDay(key, { close: e.target.value })}
                  sx={{ width: 132 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            )
          })}
        </Box>
        <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1 }}>
          A closing time earlier than the opening time runs past midnight (e.g. 6:00 PM – 1:00 AM).
        </Typography>

        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 1 }}>Closed dates (holidays)</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              type="date"
              size="small"
              value={newClosedDate}
              onChange={(e) => setNewClosedDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              variant="outlined"
              size="small"
              disabled={!newClosedDate}
              onClick={() => {
                addClosedDate(newClosedDate)
                setNewClosedDate("")
              }}
              startIcon={<KIcon icon="add" size={16} />}
            >
              Add
            </Button>
          </Box>
          {form.closedDates.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mt: 1.25 }}>
              {form.closedDates.map((d) => (
                <Chip key={d} label={formatClosedDate(d)} size="small" onDelete={() => removeClosedDate(d)} sx={{ borderRadius: radius.pill }} />
              ))}
            </Box>
          )}
        </Box>

        {settingsMsg && <Msg tone={settingsMsg.ok}>{settingsMsg.text}</Msg>}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
          <KButton loading={savingSettings} icon="save" onClick={handleSaveSettings}>
            Save settings
          </KButton>
        </Box>
      </FormSection>

      {/* ── Menu ─────────────────────────────────────────────────────────── */}
      <FormSection
        title="Menu"
        subtitle={`${publishedCount} item${publishedCount === 1 ? "" : "s"} live · ${draft.length - publishedCount} draft`}
        icon="restaurant_menu"
        action={
          <Button size="small" variant="outlined" onClick={addManual} startIcon={<KIcon icon="add" size={16} />}>
            Add item
          </Button>
        }
      >
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ flex: "1 1 260px", minWidth: 240 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleUpload(f)
                e.target.value = ""
              }}
            />
            <Button
              variant="outlined"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              startIcon={<KIcon icon="upload" size={17} />}
              fullWidth
            >
              {uploading ? "Uploading…" : menuImage ? "Replace menu photo" : "Upload menu photo"}
            </Button>
            <Button
              variant="contained"
              sx={{ mt: 1 }}
              fullWidth
              disabled={!menuImage || extracting || !aiEnabled}
              onClick={handleExtract}
              startIcon={<KIcon icon="auto_awesome" size={17} />}
            >
              {extracting ? "KIZ-AI is reading…" : "Extract menu with AI"}
            </Button>
            {!aiEnabled && (
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75 }}>
                AI is off — add items manually, or set up a vision model in AI settings.
              </Typography>
            )}
          </Box>
          <Box sx={{ flex: "1 1 260px", minWidth: 240 }}>
            {menuImage ? (
              <Box
                component="img"
                src={menuImage}
                alt="Menu"
                sx={{ display: "block", width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: `${radius.card}px`, border: "1px solid", borderColor: "divider", backgroundColor: color.canvasSunk }}
              />
            ) : (
              <Box sx={{ height: 150, borderRadius: `${radius.card}px`, border: "1px dashed", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "center", color: "text.disabled", fontSize: 13 }}>
                No menu photo yet
              </Box>
            )}
          </Box>
        </Box>

        {menuMsg && <Msg tone={menuMsg.ok}>{menuMsg.text}</Msg>}

        {draft.length === 0 ? (
          <KEmpty icon="restaurant" title="No items yet" body="Upload a menu photo and let KIZ-AI read it, or add items manually." />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {draft.map((item) => (
              <ItemEditor
                key={item.key}
                item={item}
                onChange={(patch) => updateItem(item.key, patch)}
                onRemove={() => void removeItem(item)}
              />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <KButton loading={savingMenu} icon="save" onClick={handleSaveMenu} disabled={draft.length === 0}>
            Save menu
          </KButton>
        </Box>
      </FormSection>

      {/* ── WhatsApp preview ─────────────────────────────────────────────── */}
      <FormSection title="WhatsApp preview" subtitle="What the cafe receives when a student orders." icon="chat">
        <Box
          sx={{
            p: 2,
            borderRadius: `${radius.card}px`,
            backgroundColor: "#E7FFDB",
            border: "1px solid #CDE9C4",
            fontFamily: font.body,
            fontSize: 13.5,
            whiteSpace: "pre-wrap",
            lineHeight: 1.55,
            color: "#1F2C34",
            maxWidth: 520,
          }}
        >
          {previewMessage}
        </Box>
      </FormSection>
    </Box>
  )
}

function Msg({ tone, children }: { tone: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        mt: 1.25,
        px: 1.5,
        py: 1,
        borderRadius: `${radius.input}px`,
        fontSize: 13,
        backgroundColor: tone ? color.success.soft : color.danger.soft,
        color: tone ? color.success.ink : color.danger.ink,
      }}
    >
      {children}
    </Box>
  )
}

function formatClosedDate(date: string): string {
  const d = new Date(`${date}T00:00:00+08:00`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d)
}

/** Live "Open now / Closed" preview driven by the form's current schedule. */
function StatusPreview({ config }: { config: CafeConfig }) {
  const status = cafeStatus(config)
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: radius.pill,
        backgroundColor: status.open ? color.success.soft : color.neutral.soft,
        color: status.open ? color.success.ink : color.neutral.ink,
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: status.open ? color.success.main : color.neutral.main }} />
      {status.label} · Today {status.todayHours}
    </Box>
  )
}

function ItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: DraftItem
  onChange: (patch: Partial<DraftItem>) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(!item.id)

  return (
    <Box
      sx={{
        borderRadius: `${radius.card}px`,
        border: "1px solid",
        borderColor: item.published ? "divider" : color.warning.soft,
        backgroundColor: item.published ? "background.paper" : color.warning.soft,
        p: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          label="Name"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          size="small"
          sx={{ flex: 1 }}
        />
        <TextField
          label="RM"
          type="number"
          value={item.price}
          onChange={(e) => onChange({ price: Number(e.target.value) })}
          size="small"
          sx={{ width: 100 }}
          slotProps={{ htmlInput: { step: "0.1", min: 0 } }}
        />
        <IconButton size="small" onClick={() => setExpanded((e) => !e)} aria-label="More options">
          <KIcon icon={expanded ? "expand_less" : "expand_more"} size={18} />
        </IconButton>
        <IconButton size="small" onClick={onRemove} aria-label="Remove item" sx={{ color: color.danger.main }}>
          <KIcon icon="delete" size={18} />
        </IconButton>
      </Box>

      {expanded && (
        <Box sx={{ mt: 1.25, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <FormGrid columns={2}>
            <TextField
              select
              label="Category"
              value={item.category}
              onChange={(e) => onChange({ category: e.target.value })}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            >
              {Array.from(new Set([...CAFE_CATEGORIES, item.category])).map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={item.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              size="small"
            />
          </FormGrid>

          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {DIETARY_TAGS.map((tag) => {
              const on = (item.dietary ?? []).includes(tag.value)
              return (
                <Button
                  key={tag.value}
                  size="small"
                  variant={on ? "contained" : "outlined"}
                  onClick={() =>
                    onChange({
                      dietary: on
                        ? (item.dietary ?? []).filter((d) => d !== tag.value)
                        : [...(item.dietary ?? []), tag.value],
                    })
                  }
                  startIcon={<KIcon icon={tag.icon} size={14} />}
                  sx={{ borderRadius: radius.pill, textTransform: "none" }}
                >
                  {tag.label}
                </Button>
              )
            })}
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <FormControlLabel
              control={<Switch size="small" checked={item.isAvailable ?? true} onChange={(e) => onChange({ isAvailable: e.target.checked })} />}
              label={<Typography variant="caption">Available</Typography>}
            />
            <FormControlLabel
              control={<Switch size="small" checked={item.published ?? true} onChange={(e) => onChange({ published: e.target.checked })} />}
              label={<Typography variant="caption">Published to students</Typography>}
            />
            <Typography variant="caption" sx={{ alignSelf: "center", color: "text.disabled", fontFamily: font.mono }}>
              {formatRM(Number(item.price) || 0)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}

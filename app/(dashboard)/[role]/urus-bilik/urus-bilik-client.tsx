"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { seatTone, color, radius } from "@/lib/theme"
import {
  previewImport,
  confirmImport,
  activateIntake,
  saveWindow,
  upsertBlock,
  createRoom,
  deleteBlock,
  deleteRoom,
  generateFloor,
  setRoomStatus,
  adminAssign,
  setOccupantPrivacy,
  type ImportPreview,
} from "./actions"
import type { OccupancySummary } from "@/components/shared/bilik/types"

type Gender = "male" | "female"
type RoomType = "single" | "double"
type RoomStatus = "available" | "maintenance" | "closed"

interface BlockData {
  id: string
  name: string
  gender: Gender
  floors: number
  sortOrder: number
  rooms: {
    id: string
    floor: number
    number: string
    type: RoomType
    status: RoomStatus
    totalBeds: number
    occupiedBeds: number
  }[]
}
interface StudentData {
  id: string
  matricId: string
  name: string
  gender: Gender
  isB40: boolean
  isOku: boolean
  isUniform: boolean
  room: string | null
  position: string | null
  selectedAt: string | null
  assignedByAdmin: boolean
}
interface IntakeData {
  id: string
  name: string
  status: string
  rowCount: number
  createdAt: string
}
interface WindowData {
  name: string
  opensAt: string
  closesAt: string
  closingSoonHours: number
}

export function UrusBilikClient({
  readOnly,
  window: win,
  intakes,
  blocks,
  students,
  occupancy,
  freeBeds,
  occupantPrivacy,
}: {
  readOnly: boolean
  window: WindowData | null
  intakes: IntakeData[]
  blocks: BlockData[]
  students: StudentData[]
  occupancy: OccupancySummary
  freeBeds: { id: string; label: string; gender: Gender }[]
  occupantPrivacy: "full" | "limited"
}) {
  // Principal sees only the monitor.
  const [tab, setTab] = useState(readOnly ? 3 : 0)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)
  const notify = (msg: string, sev: "success" | "error" = "success") => setToast({ msg, sev })

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Residence · Admin"
        title="Room Selection"
        subtitle="Import the accepted list, set the window, model the building, and monitor occupancy."
      />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          mb: 3,
          minHeight: 40,
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 },
        }}
      >
        {!readOnly && <Tab label="Intake" value={0} />}
        {!readOnly && <Tab label="Window" value={1} />}
        {!readOnly && <Tab label="Building" value={2} />}
        <Tab label="Occupancy" value={3} />
        {!readOnly && <Tab label="Students" value={4} />}
      </Tabs>

      {tab === 0 && !readOnly && (
        <IntakeTab intakes={intakes} notify={notify} />
      )}
      {tab === 1 && !readOnly && <WindowTab window={win} occupantPrivacy={occupantPrivacy} notify={notify} />}
      {tab === 2 && !readOnly && <BuildingTab blocks={blocks} notify={notify} />}
      {tab === 3 && <OccupancyTab blocks={blocks} occupancy={occupancy} />}
      {tab === 4 && !readOnly && (
        <StudentsTab students={students} freeBeds={freeBeds} window={win} notify={notify} />
      )}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.sev} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}

// ── Tab 1: Intake / import ──────────────────────────────────────────────────

/** Small dot-chip for an import row's disposition. */
function ImportStatusChip({ status }: { status: "ok" | "duplicate" | "invalid" | "existing" }) {
  const map = {
    ok: { tone: color.success, label: "OK" },
    duplicate: { tone: color.warning, label: "Dup" },
    invalid: { tone: color.danger, label: "Invalid" },
    existing: { tone: color.info, label: "Listed" },
  } as const
  const { tone, label } = map[status]
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.875,
        py: 0.25,
        borderRadius: 999,
        backgroundColor: tone.soft,
        color: tone.ink,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: 999, backgroundColor: tone.main }} />
      {label}
    </Box>
  )
}

function IntakeTab({
  intakes,
  notify,
}: {
  intakes: IntakeData[]
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [csv, setCsv] = useState<string>("")
  const [fileName, setFileName] = useState<string>("")
  const [intakeName, setIntakeName] = useState<string>("")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File) => {
    const text = await file.text()
    setCsv(text)
    setFileName(file.name)
    setIntakeName(file.name.replace(/\.csv$/i, ""))
    start(async () => {
      try {
        const p = await previewImport(text)
        setPreview(p)
      } catch (e) {
        notify(e instanceof Error ? e.message : "Preview failed", "error")
      }
    })
  }

  const onConfirm = () => {
    start(async () => {
      const res = await confirmImport(csv, intakeName)
      if (res.ok) {
        notify(`Nice! ${res.imported} students imported. Activate the intake to open selection.`)
        setPreview(null)
        setCsv("")
        setFileName("")
      } else {
        notify(res.error ?? "Import failed", "error")
      }
    })
  }

  return (
    <Box>
      <FormSection
        title="Upload accepted list (CSV)"
        subtitle="Export the eKolej sheet to CSV. Expected columns: Bil, No. Matrik, Nama, Fakulti, Tahun Pengajian, Jantina, Agama, Bangsa, Kolej Semasa, Pilihan 1, Tarikh Permohonan, Status Permohonan, B40, OKU, Uniform, Markah."
        icon="upload_file"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: "1.5px dashed",
            borderColor: "divider",
            borderRadius: 3,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: color.canvasSunk,
            "&:hover": { borderColor: color.borderStrong },
          }}
        >
          <KIcon icon="cloud_upload" size={28} sx={{ color: "var(--mui-palette-text-disabled)" }} />
          <Typography sx={{ fontWeight: 600, mt: 1 }}>
            {fileName || "Click to choose a CSV file"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Parsed in your browser — nothing is stored until you confirm.
          </Typography>
        </Box>
      </FormSection>

      {preview && (
        <FormSection title="Preview & validation" subtitle="Review before importing — only valid new rows are created." icon="fact_check">
          <Bento sx={{ mb: 2 }}>
            <BentoItem span={3} spanXs={1}><MetricTile label="Will import" value={preview.okCount} icon="check_circle" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Duplicate" value={preview.duplicateCount + preview.existingDuplicateCount} icon="content_copy" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Invalid" value={preview.invalidCount} icon="error" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Total rows" value={preview.totalRows} icon="table_rows" /></BentoItem>
          </Bento>

          <Alert severity="info" icon={<KIcon icon="rule" size={18} />} sx={{ mb: 2, borderRadius: 2 }}>
            Only the <b>{preview.okCount}</b> valid new{" "}
            {preview.okCount === 1 ? "row" : "rows"} will be imported. Invalid rows,
            in-file duplicates, and matric numbers already in the active intake are
            skipped automatically.
          </Alert>

          <TextField
            label="Intake name"
            size="small"
            fullWidth
            value={intakeName}
            onChange={(e) => setIntakeName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ maxHeight: 320, overflow: "auto", border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Matric</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Gender</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.rows.map((r) => (
                  <TableRow key={r.index}>
                    <TableCell>{r.index}</TableCell>
                    <TableCell>{r.matricId}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.gender}</TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <ImportStatusChip status={r.status} />
                        <Typography
                          variant="caption"
                          title={r.status === "ok" ? undefined : r.reason ?? undefined}
                          sx={{
                            color: "text.disabled",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            minWidth: 0,
                          }}
                        >
                          {r.status === "ok"
                            ? "Will import"
                            : r.reason ?? (r.status === "existing" ? "Already listed" : "Skipped")}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <KButton onClick={onConfirm} loading={pending} icon="download_done" disabled={preview.okCount === 0}>
              Import {preview.okCount} {preview.okCount === 1 ? "student" : "students"}
            </KButton>
            <KButton variant="outlined" onClick={() => setPreview(null)}>
              Cancel
            </KButton>
          </Box>
        </FormSection>
      )}

      <FormSection title="Intakes" subtitle="Activate one intake to open room selection for its students." icon="groups">
        {intakes.length === 0 ? (
          <KEmpty compact icon="groups" title="No intakes yet" body="Upload a CSV above to get your first intake rolling." />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {intakes.map((i) => (
              <Box
                key={i.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{i.name}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {i.rowCount} students · {new Date(i.createdAt).toLocaleDateString("en-MY")}
                  </Typography>
                </Box>
                <StatusChip
                  tone={i.status === "active" ? "success" : i.status === "archived" ? "neutral" : "info"}
                  status={i.status === "active" ? "found" : undefined}
                />
                {i.status !== "active" && (
                  <ActivateButton intakeId={i.id} notify={notify} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </FormSection>
    </Box>
  )
}

function ActivateButton({ intakeId, notify }: { intakeId: string; notify: (m: string) => void }) {
  const [pending, start] = useTransition()
  return (
    <KButton
      size="small"
      variant="outlined"
      loading={pending}
      onClick={() => start(async () => {
        await activateIntake(intakeId)
        notify("Intake activated — game on!")
      })}
    >
      Activate
    </KButton>
  )
}

// ── Tab 2: Window ───────────────────────────────────────────────────────────

function WindowTab({
  window: win,
  occupantPrivacy,
  notify,
}: {
  window: WindowData | null
  occupantPrivacy: "full" | "limited"
  notify: (m: string, s?: "success" | "error") => void
}) {
  const toLocal = (iso: string | undefined) => (iso ? iso.slice(0, 16) : "")
  const [name, setName] = useState(win?.name ?? "")
  const [opensAt, setOpensAt] = useState(toLocal(win?.opensAt))
  const [closesAt, setClosesAt] = useState(toLocal(win?.closesAt))
  const [closingSoon, setClosingSoon] = useState(win?.closingSoonHours ?? 24)
  const [pending, start] = useTransition()

  const save = () => {
    start(async () => {
      try {
        await saveWindow({
          name,
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
          closingSoonHours: Number(closingSoon),
        })
        notify("Window saved — students can now pick their beds.")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to save window", "error")
      }
    })
  }

  return (
    <Box>
      <FormSection title="Selection window" subtitle="One active window at a time. Times are Asia/Kuala_Lumpur." icon="event">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <TextField label="Window name" size="small" value={name} onChange={(e) => setName(e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
          <TextField label="Opens at" type="datetime-local" size="small" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Closes at" type="datetime-local" size="small" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="'Closing soon' threshold (hours)" type="number" size="small" value={closingSoon} onChange={(e) => setClosingSoon(Number(e.target.value))} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <KButton onClick={save} loading={pending} icon="save" disabled={!opensAt || !closesAt}>
            Save window
          </KButton>
        </Box>
      </FormSection>

      <PrivacySection current={occupantPrivacy} notify={notify} />
    </Box>
  )
}

/** Toggle for how much occupant detail students see on a taken bed. */
function PrivacySection({
  current,
  notify,
}: {
  current: "full" | "limited"
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [mode, setMode] = useState(current)
  const [pending, start] = useTransition()

  const apply = (next: "full" | "limited") => {
    setMode(next)
    start(async () => {
      try {
        await setOccupantPrivacy(next)
        notify(next === "full" ? "Showing full occupant details" : "Limited occupant details")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to update", "error")
      }
    })
  }

  const options = [
    {
      key: "full" as const,
      title: "Full details",
      body: "Short name, matric number, religion, race, and nationality.",
      icon: "badge",
    },
    {
      key: "limited" as const,
      title: "Limited details",
      body: "Short name and nationality only. Hides matric, religion, and race from peers.",
      icon: "shield_person",
    },
  ]

  return (
    <FormSection
      title="Occupant privacy"
      subtitle="Controls what students see about existing occupants on a taken bed. Students always see their own full details."
      icon="visibility"
    >
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        {options.map((o) => {
          const active = mode === o.key
          return (
            <Box
              key={o.key}
              component="button"
              type="button"
              disabled={pending}
              onClick={() => apply(o.key)}
              sx={{
                textAlign: "left",
                cursor: "pointer",
                p: 2,
                borderRadius: 3,
                border: "1.5px solid",
                borderColor: active ? color.accent[400] : "divider",
                backgroundColor: active ? color.accent[50] : "background.paper",
                boxShadow: active ? `0 0 0 3px ${color.accent[100]}` : "none",
                transition: "border-color 160ms, box-shadow 160ms, background-color 160ms",
                "&:hover": { borderColor: active ? color.accent[400] : color.borderStrong },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <KIcon
                  icon={o.icon}
                  size={18}
                  filled={active}
                  sx={{ color: active ? color.accent[700] : "var(--mui-palette-text-secondary)" }}
                />
                <Typography sx={{ fontWeight: 600 }}>{o.title}</Typography>
                {active && (
                  <KIcon icon="check_circle" size={16} filled sx={{ color: color.accent[600], marginLeft: "auto" }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {o.body}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </FormSection>
  )
}

// ── Tab 3: Building ──────────────────────────────────────────────────────────

function BuildingTab({
  blocks,
  notify,
}: {
  blocks: BlockData[]
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [pending, start] = useTransition()
  // add-block form
  const [newName, setNewName] = useState("")
  const [newGender, setNewGender] = useState<Gender>("male")
  const [newFloors, setNewFloors] = useState(4)
  const [newSort, setNewSort] = useState(blocks.length)
  // add-room form
  const [roomBlock, setRoomBlock] = useState(blocks[0]?.id ?? "")
  const [roomFloor, setRoomFloor] = useState(1)
  const [roomNumber, setRoomNumber] = useState("")
  const [roomType, setRoomType] = useState<RoomType>("double")
  // generate-floor form
  const [genBlock, setGenBlock] = useState(blocks[0]?.id ?? "")
  const [genFloor, setGenFloor] = useState(1)
  const [genCount, setGenCount] = useState(10)
  const [genType, setGenType] = useState<RoomType>("double")
  const [genPrefix, setGenPrefix] = useState("A-")
  // edit-block dialog
  const [editing, setEditing] = useState<BlockData | null>(null)

  const addBlock = () => {
    if (!newName.trim()) {
      notify("Give the block a name", "error")
      return
    }
    start(async () => {
      try {
        await upsertBlock({ name: newName, gender: newGender, floors: newFloors, sortOrder: newSort })
        notify("Block added — ready for rooms.")
        setNewName("")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to add block", "error")
      }
    })
  }

  const addRoom = () => {
    if (!roomBlock || !roomNumber.trim()) {
      notify("Pick a block and enter a room number", "error")
      return
    }
    start(async () => {
      try {
        await createRoom({ blockId: roomBlock, floor: roomFloor, number: roomNumber.trim(), type: roomType })
        notify("Room added!")
        setRoomNumber("")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to add room", "error")
      }
    })
  }

  const onDeleteBlock = (b: BlockData) => {
    if (!confirm(`Delete block ${b.name}? Its empty rooms are removed too.`)) return
    start(async () => {
      try {
        await deleteBlock(b.id)
        notify(`${b.name} is gone.`)
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to delete block", "error")
      }
    })
  }

  const onDeleteRoom = (b: BlockData, r: BlockData["rooms"][number]) => {
    if (!confirm(`Delete room ${r.number} in ${b.name}?`)) return
    start(async () => {
      try {
        await deleteRoom(r.id)
        notify(`Room ${r.number} in ${b.name} is gone.`)
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to delete room", "error")
      }
    })
  }

  return (
    <Box>
      {/* Add block */}
      <FormSection title="Add a block" subtitle="Create a new residence block, then add floors and rooms to it." icon="add_home">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" } }}>
          <TextField size="small" label="Block name" placeholder="e.g. K20A" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <TextField select size="small" label="Gender" value={newGender} onChange={(e) => setNewGender(e.target.value as Gender)}>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
          </TextField>
          <TextField type="number" size="small" label="Floors" value={newFloors} onChange={(e) => setNewFloors(Number(e.target.value))} />
          <TextField type="number" size="small" label="Sort order" value={newSort} onChange={(e) => setNewSort(Number(e.target.value))} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <KButton loading={pending} icon="add" onClick={addBlock}>
            Add block
          </KButton>
        </Box>
      </FormSection>

      {/* Add room */}
      <FormSection title="Add a room" subtitle="Add one room on any floor; its beds are created automatically." icon="add_business">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" } }}>
          <TextField select size="small" label="Block" value={roomBlock} onChange={(e) => setRoomBlock(e.target.value)}>
            {blocks.length === 0 ? <MenuItem value="" disabled>No blocks yet</MenuItem> : blocks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <TextField type="number" size="small" label="Floor" value={roomFloor} onChange={(e) => setRoomFloor(Number(e.target.value))} />
          <TextField size="small" label="Room number" placeholder="e.g. 301" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          <TextField select size="small" label="Type" value={roomType} onChange={(e) => setRoomType(e.target.value as RoomType)}>
            <MenuItem value="single">Single</MenuItem>
            <MenuItem value="double">Double</MenuItem>
          </TextField>
        </Box>
        <Box sx={{ mt: 2 }}>
          <KButton loading={pending} icon="add" onClick={addRoom} disabled={!roomBlock}>
            Add room
          </KButton>
        </Box>
      </FormSection>

      {/* Generate a floor */}
      <FormSection title="Generate a floor" subtitle="Bulk-create sequential rooms; beds are created automatically." icon="grid_on">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(5, 1fr)" } }}>
          <TextField select size="small" label="Block" value={genBlock} onChange={(e) => setGenBlock(e.target.value)}>
            {blocks.length === 0 ? <MenuItem value="" disabled>No blocks yet</MenuItem> : blocks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <TextField type="number" size="small" label="Floor" value={genFloor} onChange={(e) => setGenFloor(Number(e.target.value))} />
          <TextField type="number" size="small" label="Rooms" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
          <TextField select size="small" label="Type" value={genType} onChange={(e) => setGenType(e.target.value as RoomType)}>
            <MenuItem value="single">Single</MenuItem>
            <MenuItem value="double">Double</MenuItem>
          </TextField>
          <TextField size="small" label="Prefix" value={genPrefix} onChange={(e) => setGenPrefix(e.target.value)} helperText="e.g. A- → A-101" />
        </Box>
        <Box sx={{ mt: 2 }}>
          <KButton
            loading={pending}
            icon="grid_on"
            disabled={!genBlock}
            onClick={() => start(async () => {
              try {
                await generateFloor({ blockId: genBlock, floor: genFloor, count: genCount, type: genType, prefix: genPrefix })
                notify(`Floor ${genFloor} generated — rooms ready to go.`)
              } catch (e) {
                notify(e instanceof Error ? e.message : "Failed", "error")
              }
            })}
          >
            Generate {genCount} rooms
          </KButton>
        </Box>
      </FormSection>

      {blocks.length === 0 ? (
        <KEmpty icon="apartment" title="Nothing built yet" body="Add a block above, then add rooms or generate a floor." />
      ) : (
        blocks.map((b) => (
          <FormSection
            key={b.id}
            title={`${b.name} · ${b.gender === "male" ? "Male" : "Female"}`}
            subtitle={`${b.rooms.length} rooms`}
            icon="apartment"
            action={
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButtonSmall title="Edit block" icon="edit" onClick={() => setEditing(b)} />
                <IconButtonSmall title="Delete block" icon="delete" danger onClick={() => onDeleteBlock(b)} />
              </Box>
            }
          >
            {b.rooms.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No rooms yet — add one above or generate a floor.
              </Typography>
            ) : (
              <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(4,1fr)" } }}>
                {b.rooms.map((r) => (
                  <Box key={r.id} sx={{ p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2, position: "relative" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 3, gap: 0.5, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{r.number}</Typography>
                      <Typography variant="caption" sx={{ color: "text.disabled", flexShrink: 0 }}>{r.occupiedBeds}/{r.totalBeds}</Typography>
                    </Box>
                    <Box
                      component="button"
                      onClick={() => onDeleteRoom(b, r)}
                      title="Delete room"
                      aria-label={`Delete room ${r.number}`}
                      sx={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: 1,
                        border: "none",
                        background: "transparent",
                        color: "text.disabled",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "&:hover": { backgroundColor: "action.hover", color: "error.main" },
                      }}
                    >
                      <KIcon icon="close" size={13} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                      Floor {r.floor} · {r.type}
                    </Typography>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={r.status}
                      onChange={(e) => start(async () => {
                        await setRoomStatus(r.id, e.target.value as RoomStatus)
                        notify(`${r.number} → ${e.target.value}`)
                      })}
                      sx={{ "& .MuiInputBase-input": { fontSize: 12, py: 0.5 } }}
                    >
                      <MenuItem value="available">Available</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                    </TextField>
                  </Box>
                ))}
              </Box>
            )}
          </FormSection>
        ))
      )}

      {editing && (
        <BlockEditDialog
          block={editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={async (input) => {
            start(async () => {
              try {
                await upsertBlock({ id: editing.id, ...input })
                notify("Block updated!")
                setEditing(null)
              } catch (e) {
                notify(e instanceof Error ? e.message : "Failed to update block", "error")
              }
            })
          }}
        />
      )}
    </Box>
  )
}

/** Small square icon button used inside block cards. */
function IconButtonSmall({
  title,
  icon,
  danger = false,
  onClick,
}: {
  title: string
  icon: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      sx={{
        width: 30,
        height: 30,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        color: danger ? "error.main" : "text.secondary",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 140ms, color 140ms",
        "&:hover": { backgroundColor: "action.hover" },
      }}
    >
      <KIcon icon={icon} size={16} />
    </Box>
  )
}

/** Dialog for renaming a block / adjusting its gender, floors, and order. */
function BlockEditDialog({
  block,
  pending,
  onCancel,
  onSave,
}: {
  block: BlockData
  pending: boolean
  onCancel: () => void
  onSave: (input: { name: string; gender: Gender; floors: number; sortOrder?: number }) => void
}) {
  const [name, setName] = useState(block.name)
  const [gender, setGender] = useState<Gender>(block.gender)
  const [floors, setFloors] = useState(block.floors)
  const [sortOrder, setSortOrder] = useState(block.sortOrder)

  return (
    <Dialog open onClose={onCancel} slotProps={{ paper: { sx: { borderRadius: radius.sheet, width: "100%", maxWidth: 440 } } }}>
      <DialogTitle sx={{ fontWeight: 640, letterSpacing: "-0.02em" }}>Edit block</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
          <TextField size="small" label="Block name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select size="small" label="Gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
          </TextField>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr" }}>
            <TextField type="number" size="small" label="Floors" value={floors} onChange={(e) => setFloors(Number(e.target.value))} />
            <TextField type="number" size="small" label="Sort order" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <KButton variant="text" onClick={onCancel} disabled={pending}>Cancel</KButton>
        <KButton
          loading={pending}
          disabled={!name.trim()}
          onClick={() => onSave({ name, gender, floors, sortOrder })}
        >
          Save
        </KButton>
      </DialogActions>
    </Dialog>
  )
}

// ── Tab 4: Occupancy monitor ─────────────────────────────────────────────────

function OccupancyTab({ blocks, occupancy }: { blocks: BlockData[]; occupancy: OccupancySummary }) {
  return (
    <Box>
      <Bento sx={{ mb: 3 }}>
        <BentoItem span={2} spanXs={1}><MetricTile label="Occupancy" value={`${occupancy.occupancyPct}%`} icon="donut_large" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Filled" value={occupancy.filled} icon="bed" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Free" value={occupancy.free} icon="chair" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Maintenance" value={occupancy.maintenance} icon="build" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Total beds" value={occupancy.totalBeds} icon="king_bed" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Not selected" value={occupancy.notSelected} icon="person_off" emphasis /></BentoItem>
      </Bento>

      {blocks.map((b) => (
        <FormSection key={b.id} title={b.name} subtitle={`${b.rooms.filter((r) => r.occupiedBeds >= r.totalBeds && r.totalBeds > 0).length} full · ${b.rooms.length} rooms`} icon="apartment">
          <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "repeat(4,1fr)", sm: "repeat(8,1fr)" } }}>
            {b.rooms.map((r) => {
              const state =
                r.status === "maintenance" ? "maintenance" :
                r.status === "closed" ? "closed" :
                r.occupiedBeds === 0 ? "available" :
                r.occupiedBeds >= r.totalBeds ? "full" : "partial"
              const c = seatTone(state)
              return (
                <Box
                  key={r.id}
                  title={`${r.number} — ${r.occupiedBeds}/${r.totalBeds}`}
                  sx={{
                    p: 0.75,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: c.border,
                    backgroundColor: c.fill,
                    color: c.ink,
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: 11 }} noWrap>{r.number}</Typography>
                  <Typography sx={{ fontSize: 10 }}>{r.occupiedBeds}/{r.totalBeds}</Typography>
                </Box>
              )
            })}
          </Box>
        </FormSection>
      ))}
    </Box>
  )
}

// ── Tab 5: Students ──────────────────────────────────────────────────────────

function StudentsTab({
  students,
  freeBeds,
  window: win,
  notify,
}: {
  students: StudentData[]
  freeBeds: { id: string; label: string; gender: Gender }[]
  window: WindowData | null
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [filter, setFilter] = useState<"all" | "selected" | "not_selected">("all")
  const [search, setSearch] = useState("")
  // "now" snapshot set after mount so SSR and the first client render agree —
  // otherwise the deadline-dependent UI (assign controls, info alert) can
  // mismatch between server and client.
  const [mountedAt, setMountedAt] = useState<number | null>(null)
  useEffect(() => {
    const id = window.setTimeout(() => setMountedAt(Date.now()), 0)
    return () => window.clearTimeout(id)
  }, [])

  const deadlinePassed = win ? mountedAt !== null && new Date(win.closesAt).getTime() <= mountedAt : false

  const filtered = students.filter((s) => {
    if (filter === "selected" && !s.room) return false
    if (filter === "not_selected" && s.room) return false
    if (search && !`${s.matricId} ${s.name}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="Search matric or name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
        {(["all", "selected", "not_selected"] as const).map((f) => (
          <Box
            key={f}
            component="button"
            onClick={() => setFilter(f)}
            sx={{
              px: 1.5, py: 0.75, borderRadius: 999, border: "1px solid",
              borderColor: filter === f ? "transparent" : "divider",
              backgroundColor: filter === f ? "primary.main" : "background.paper",
              color: filter === f ? "primary.contrastText" : "text.secondary",
              fontWeight: 600, fontSize: 12.5, cursor: "pointer",
            }}
          >
            {f === "all" ? "All" : f === "selected" ? "Selected" : "Not selected"}
          </Box>
        ))}
      </Box>

      {!deadlinePassed && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Manual assignment unlocks after the selection deadline. Until then, students self-select.
        </Alert>
      )}

      {filtered.length === 0 ? (
        <KEmpty icon="group" title="No one here" body="No students match this filter, or no intake is active." />
      ) : (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Matric</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Flags</TableCell>
                <TableCell>Room</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.matricId}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {s.isB40 && <MiniTag label="B40" />}
                      {s.isOku && <MiniTag label="OKU" />}
                      {s.isUniform && <MiniTag label="Uniform" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {s.room ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="body2">{s.room}</Typography>
                        {s.assignedByAdmin && <MiniTag label="assigned" />}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {!s.room && deadlinePassed && (
                      <AssignControl
                        studentId={s.id}
                        beds={freeBeds.filter((b) => b.gender === s.gender)}
                        notify={notify}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

function MiniTag({ label }: { label: string }) {
  return (
    <Box sx={{ px: 0.75, py: 0.125, borderRadius: 1, fontSize: 10, fontWeight: 700, backgroundColor: color.brand[50], color: color.brand[700] }}>
      {label}
    </Box>
  )
}

function AssignControl({
  studentId,
  beds,
  notify,
}: {
  studentId: string
  beds: { id: string; label: string }[]
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [bedId, setBedId] = useState("")
  const [pending, start] = useTransition()
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", justifyContent: "flex-end" }}>
      <TextField
        select
        size="small"
        value={bedId}
        onChange={(e) => setBedId(e.target.value)}
        sx={{ minWidth: 160, "& .MuiInputBase-input": { fontSize: 12, py: 0.5 } }}
        placeholder="Bed"
      >
        {beds.length === 0 ? (
          <MenuItem value="" disabled>No free beds</MenuItem>
        ) : (
          beds.map((b) => <MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>)
        )}
      </TextField>
      <KButton
        size="small"
        loading={pending}
        disabled={!bedId}
        onClick={() => start(async () => {
          const res = await adminAssign(studentId, bedId)
          notify(res.ok ? "Student assigned — all set!" : res.error ?? "That didn't work — try again.", res.ok ? "success" : "error")
        })}
      >
        Assign
      </KButton>
    </Box>
  )
}

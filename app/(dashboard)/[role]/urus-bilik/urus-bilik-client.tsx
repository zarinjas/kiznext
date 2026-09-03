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
import Checkbox from "@mui/material/Checkbox"
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
  deleteRoom,
  generateFloor,
  setRoomStatus,
  setRoomsStatus,
  adminAssign,
  setAllocationsPublished,
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
    beds: { id: string; position: string; occupant: { id: string; name: string; matricId: string } | null }[]
  }[]
}
interface StudentData {
  id: string
  matricId: string
  name: string
  gender: Gender
  race: string | null
  religion: string | null
  nationality: string
  faculty: string | null
  yearOfStudy: string | null
  currentCollege: string | null
  merit: number | null
  isB40: boolean
  isOku: boolean
  isUniform: boolean
  room: string | null
  position: string | null
  selectedAt: string | null
  assignedByAdmin: boolean
  applicationType: "single" | "double" | "flexible" | null
  applicationStatus: string | null
  roommate: string | null
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
  allocationsPublished,
}: {
  readOnly: boolean
  window: WindowData | null
  intakes: IntakeData[]
  blocks: BlockData[]
  students: StudentData[]
  occupancy: OccupancySummary
  freeBeds: { id: string; label: string; gender: Gender }[]
  allocationsPublished: boolean
}) {
  // Principal sees only the monitor.
  const [tab, setTab] = useState(readOnly ? 2 : 0)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)
  const notify = (msg: string, sev: "success" | "error" = "success") => setToast({ msg, sev })

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Residence · Admin"
        title="Accommodation allocation"
        subtitle="Follow the steps below. Students only see their room after you publish the completed allocation."
      />

      {!readOnly && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        <b>Simple workflow:</b> set up the intake and dates, review applications, allocate rooms after the deadline, then publish the results.
      </Alert>}

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
        {!readOnly && <Tab label="1. Applications & allocation" value={0} />}
        {!readOnly && <Tab label="2. Cycle setup" value={1} />}
        <Tab label={readOnly ? "Occupancy overview" : "3. Room inventory"} value={2} />
      </Tabs>

      {tab === 0 && !readOnly && (
        <StudentsTab students={students} freeBeds={freeBeds} window={win} notify={notify} />
      )}
      {tab === 1 && !readOnly && <Box><IntakeTab intakes={intakes} notify={notify} /><WindowTab window={win} allocationsPublished={allocationsPublished} notify={notify} /></Box>}
      {tab === 2 && <Box>{!readOnly && <BuildingTab blocks={blocks} students={students} window={win} notify={notify} />}<OccupancyTab blocks={blocks} occupancy={occupancy} /></Box>}

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
            <Table size="small" stickyHeader sx={{ minWidth: 640 }}>
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

      <FormSection title="Student offer list" subtitle="Step 1: upload the accepted students, check the preview, then activate one list for this application cycle." icon="groups">
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
  allocationsPublished,
  notify,
}: {
  window: WindowData | null
  allocationsPublished: boolean
  notify: (m: string, s?: "success" | "error") => void
}) {
  const toLocal = (iso: string | undefined) => {
    if (!iso) return ""
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso))
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    return `${value.year}-${value.month}-${value.day}T${value.hour === "24" ? "00" : value.hour}:${value.minute}`
  }
  const [name, setName] = useState(win?.name ?? "")
  const [opensAt, setOpensAt] = useState(toLocal(win?.opensAt))
  const [closesAt, setClosesAt] = useState(toLocal(win?.closesAt))
  const [pending, start] = useTransition()

  const save = () => {
    start(async () => {
      try {
        await saveWindow({
          name,
          opensAt: new Date(opensAt).toISOString(),
          closesAt: new Date(closesAt).toISOString(),
          closingSoonHours: 24,
        })
        notify("Application period saved. Students can now submit their preferences.")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Failed to save window", "error")
      }
    })
  }

  return (
    <Box>
      <FormSection title="Application period" subtitle="Step 2: choose when students can send their accommodation preference. All times use Malaysia time." icon="event">
        <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
          Students can apply only between the opening and closing dates. After the closing date, you can start assigning rooms. The system will remind students when the deadline is near.
        </Alert>
        <Box sx={{ display: "grid", gap: 2.5 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Step 1: Name this application round</Typography>
            <TextField fullWidth label="Application round name" value={name} onChange={(e) => setName(e.target.value)} helperText="Example: KIZ accommodation 2026/2027" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>Step 2: Set the application dates</Typography>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 1.25 }}>Choose the date and time when the form opens and closes. Students cannot submit outside this period.</Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <TextField fullWidth label="Opening date and time" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} helperText="Students can start applying from this time." slotProps={{ inputLabel: { shrink: true } }} />
              <TextField fullWidth label="Closing date and time" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} helperText="Students can no longer change their choice after this time." slotProps={{ inputLabel: { shrink: true } }} />
            </Box>
          </Box>
        </Box>
        <Box sx={{ mt: 2.5, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <KButton onClick={save} loading={pending} icon="save" disabled={!name.trim() || !opensAt || !closesAt}>
            Save application period
          </KButton>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>The previous period will be replaced.</Typography>
        </Box>
      </FormSection>

      <AllocationPublishSection published={allocationsPublished} notify={notify} />
    </Box>
  )
}

function AllocationPublishSection({ published, notify }: { published: boolean; notify: (m: string, s?: "success" | "error") => void }) {
  const [pending, start] = useTransition()
  return <FormSection title="Show room results to students" subtitle="Use this only after every student has been assigned a room." icon="visibility">
    <Alert severity={published ? "success" : "info"} sx={{ mb: 2, borderRadius: 2 }}>
      {published ? <><b>Room results are now visible.</b> Students can see their assigned room number on the Accommodation page.</> : <><b>Room results are still hidden.</b> Students cannot see any room assignment yet, even if you have already entered it. This gives you time to finish checking the list.</>}
    </Alert>
    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>When all assignments are complete, click the button below once. The system will not allow you to publish while any student is still waiting for a room.</Typography>
    <KButton loading={pending} color={published ? "warning" : "primary"} variant={published ? "outlined" : "contained"} onClick={() => start(async () => { try { await setAllocationsPublished(!published); notify(!published ? "Room results are now visible to students." : "Room results are hidden again.") } catch (e) { notify(e instanceof Error ? e.message : "Could not update room-result visibility", "error") } })}>{published ? "Hide room results" : "Publish room results"}</KButton>
  </FormSection>
}

// ── Tab 3: Building ──────────────────────────────────────────────────────────

function BuildingTab({
  blocks,
  students,
  window: win,
  notify,
}: {
  blocks: BlockData[]
  students: StudentData[]
  window: WindowData | null
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [pending, start] = useTransition()
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id ?? "")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<RoomStatus>("maintenance")
  const [showAdd, setShowAdd] = useState(false)
  const [manageRoom, setManageRoom] = useState<BlockData["rooms"][number] | null>(null)
  const [mountedAt, setMountedAt] = useState<number | null>(null)
  useEffect(() => {
    const id = window.setTimeout(() => setMountedAt(Date.now()), 0)
    return () => window.clearTimeout(id)
  }, [])
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

  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? blocks[0]
  const activeRooms = activeBlock?.rooms ?? []
  const canAssign = Boolean(win && mountedAt !== null && new Date(win.closesAt).getTime() <= mountedAt)
  const toggleRoom = (id: string) => setSelectedRoomIds((current) => current.includes(id) ? current.filter((roomId) => roomId !== id) : [...current, id])
  const applyBulkStatus = () => {
    if (!selectedRoomIds.length) return
    if (!confirm(`Change ${selectedRoomIds.length} selected room${selectedRoomIds.length === 1 ? "" : "s"} to ${bulkStatus}?`)) return
    start(async () => {
      try {
        const count = await setRoomsStatus(selectedRoomIds, bulkStatus)
        setSelectedRoomIds([])
        notify(`${count} room${count === 1 ? "" : "s"} updated.`)
      } catch (e) {
        notify(e instanceof Error ? e.message : "Could not update rooms", "error")
      }
    })
  }

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}><b>How to use room inventory:</b> select a block, tick one or more rooms, then change their status together. Use <b>Add rooms</b> only when new rooms need to be added.</Alert>
      <Bento sx={{ mb: 2 }}>
        <BentoItem span={3} spanXs={1}><MetricTile label="Blocks" value={blocks.length} icon="apartment" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Rooms" value={blocks.reduce((total, block) => total + block.rooms.length, 0)} icon="meeting_room" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Maintenance" value={blocks.reduce((total, block) => total + block.rooms.filter((room) => room.status === "maintenance").length, 0)} icon="construction" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Closed" value={blocks.reduce((total, block) => total + block.rooms.filter((room) => room.status === "closed").length, 0)} icon="lock" /></BentoItem>
      </Bento>
      {blocks.length > 0 && <FormSection title="Choose a block" subtitle="Rooms are shown one block at a time to keep this page easy to read." icon="apartment" action={<KButton size="small" variant="outlined" icon="add_home" onClick={() => setShowAdd(true)}>Add new block</KButton>}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{blocks.map((block) => <KButton key={block.id} size="small" variant={activeBlock?.id === block.id ? "contained" : "outlined"} onClick={() => { setActiveBlockId(block.id); setSelectedRoomIds([]) }}>{block.name} · {block.gender === "male" ? "Male" : "Female"}</KButton>)}</Box>
      </FormSection>}
      {activeBlock && <FormSection title={`${activeBlock.name} rooms`} subtitle={`${activeRooms.length} rooms. Tick rooms first if you want to change more than one status.`} icon="meeting_room" action={<Box sx={{ display: "flex", gap: 1 }}><KButton size="small" variant="outlined" icon="edit" onClick={() => setEditing(activeBlock)}>Edit block</KButton><KButton size="small" variant="outlined" icon="add" onClick={() => setShowAdd((value) => !value)}>{showAdd ? "Hide add rooms" : "Add rooms"}</KButton></Box>}>
        {selectedRoomIds.length > 0 && <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25, mb: 2, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: color.warning.main, backgroundColor: color.warning.soft }}>
          <Typography variant="body2" sx={{ flex: "1 1 200px", minWidth: 0 }}><b>{selectedRoomIds.length} room{selectedRoomIds.length === 1 ? "" : "s"} selected.</b> Change all selected rooms to:</Typography>
          <TextField select size="small" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as RoomStatus)} sx={{ minWidth: 150, flex: "0 0 auto", "& .MuiInputBase-input": { py: 0.55, fontSize: 13 } }}><MenuItem value="available">Available</MenuItem><MenuItem value="maintenance">Maintenance</MenuItem><MenuItem value="closed">Closed</MenuItem></TextField>
          <KButton size="small" loading={pending} onClick={applyBulkStatus}>Apply</KButton>
        </Box>}
        {activeRooms.length === 0 ? <KEmpty compact icon="meeting_room" title="No rooms in this block" body="Use Add rooms to create the first room or generate a whole floor." /> : <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" } }}>{activeRooms.map((room) => <RoomInventoryCard key={room.id} room={room} selected={selectedRoomIds.includes(room.id)} onToggle={() => toggleRoom(room.id)} onStatus={(status) => start(async () => { await setRoomStatus(room.id, status); notify(`${room.number} is now ${status}.`) })} onDelete={() => onDeleteRoom(activeBlock, room)} onManage={() => setManageRoom(room)} />)}</Box>}
      </FormSection>}
      {showAdd && <Box>
      <FormSection title="Add a block" subtitle="Only use this when a new residence block is opened." icon="add_home">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
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

      <FormSection title="Add one room" subtitle="Beds are created automatically. Choose the block, floor, room number, and room type." icon="add_business">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
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

      <FormSection title="Add many rooms at once" subtitle="Use this for a new floor. The system creates the rooms and beds automatically." icon="grid_on">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
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

      </Box>}
      {blocks.length === 0 && !showAdd && <KEmpty icon="apartment" title="No rooms yet" body="Create your first residence block to start adding rooms." actionLabel="Add first block" onAction={() => setShowAdd(true)} />}

      <RoomOccupantsDialog room={manageRoom} students={students} canAssign={canAssign} notify={notify} onClose={() => setManageRoom(null)} />

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

function RoomInventoryCard({ room, selected, onToggle, onStatus, onDelete, onManage }: { room: BlockData["rooms"][number]; selected: boolean; onToggle: () => void; onStatus: (status: RoomStatus) => void; onDelete: () => void; onManage: () => void }) {
  const tone = room.status === "available" ? "success" : room.status === "maintenance" ? "warning" : "danger"
  return <Box sx={{ p: 1.5, border: "1px solid", borderColor: selected ? "primary.main" : "divider", borderRadius: 2, backgroundColor: selected ? "action.selected" : "background.paper" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}><Checkbox size="small" checked={selected} onChange={onToggle} /><Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontWeight: 700 }} noWrap>{room.number}</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Floor {room.floor} · {room.type} · {room.occupiedBeds}/{room.totalBeds} filled</Typography></Box><IconButtonSmall title={`Delete ${room.number}`} icon="delete" danger onClick={onDelete} /></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}><StatusChip tone={tone} /><TextField select size="small" value={room.status} onChange={(event) => onStatus(event.target.value as RoomStatus)} sx={{ flex: 1, "& .MuiInputBase-input": { py: 0.45, fontSize: 12 } }}><MenuItem value="available">Available</MenuItem><MenuItem value="maintenance">Maintenance</MenuItem><MenuItem value="closed">Closed</MenuItem></TextField></Box>
    <Box sx={{ mt: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>{room.beds.map((bed) => <Typography key={bed.id} variant="caption" sx={{ display: "block", color: bed.occupant ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bed.position}: {bed.occupant ? bed.occupant.name : "Empty"}</Typography>)}<KButton size="small" variant="text" sx={{ mt: 0.5, px: 0 }} onClick={onManage}>Manage occupants</KButton></Box>
  </Box>
}

function RoomOccupantsDialog({ room, students, canAssign, notify, onClose }: {
  room: BlockData["rooms"][number] | null
  students: StudentData[]
  canAssign: boolean
  notify: (m: string, s?: "success" | "error") => void
  onClose: () => void
}) {
  const [studentId, setStudentId] = useState("")
  const [bedId, setBedId] = useState("")
  const [pending, start] = useTransition()
  if (!room) return null
  const emptyBeds = room.beds.filter((bed) => !bed.occupant)
  const candidates = students
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: 2 } } }}>
    <DialogTitle sx={{ fontWeight: 650 }}>Manage occupants: {room.number}</DialogTitle>
    <DialogContent>
      <Alert severity={canAssign ? "info" : "warning"} sx={{ mb: 2, borderRadius: 2 }}>{canAssign ? "You can assign an unallocated student to an empty bed here. Moving a student releases their previous room automatically." : "Room assignments unlock after the application period closes. You can view occupants now."}</Alert>
      <Box sx={{ display: "grid", gap: 1, mb: 2 }}>{room.beds.map((bed) => <Box key={bed.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Typography sx={{ fontWeight: 650, textTransform: "capitalize" }}>{bed.position} bed</Typography>{bed.occupant ? <Typography variant="body2">{bed.occupant.name} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({bed.occupant.matricId})</Typography></Typography> : <Typography variant="body2" sx={{ color: "text.disabled" }}>Empty</Typography>}</Box>)}</Box>
      {canAssign && emptyBeds.length > 0 && <Box sx={{ display: "grid", gap: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Add or move a student</Typography><TextField select fullWidth label="Student" value={studentId} onChange={(event) => setStudentId(event.target.value)} helperText="Choosing someone with a current room will move them here and release their old room."><MenuItem value="">Choose a student</MenuItem>{candidates.map((student) => <MenuItem key={student.id} value={student.id}>{student.name} · {student.matricId}{student.room ? ` · currently ${student.room}` : " · no room yet"}</MenuItem>)}</TextField><TextField select fullWidth label="Empty bed" value={bedId} onChange={(event) => setBedId(event.target.value)}><MenuItem value="">Choose an empty bed</MenuItem>{emptyBeds.map((bed) => <MenuItem key={bed.id} value={bed.id}>{bed.position} bed</MenuItem>)}</TextField><KButton loading={pending} disabled={!studentId || !bedId} onClick={() => start(async () => { const result = await adminAssign(studentId, bedId); notify(result.ok ? "Student assigned to this room." : result.error ?? "Could not assign student.", result.ok ? "success" : "error"); if (result.ok) onClose() })}>Save room assignment</KButton></Box>}
    </DialogContent>
    <DialogActions><KButton variant="text" onClick={onClose}>Close</KButton></DialogActions>
  </Dialog>
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

/** Dialog for changing a block's basic details. */
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

  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: 2 } } }}>
      <DialogTitle sx={{ fontWeight: 640, letterSpacing: "-0.02em" }}>Edit block</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, pt: 0.5 }}>
          <TextField size="small" label="Block name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField select size="small" label="Gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
          </TextField>
          <TextField type="number" size="small" label="Number of floors" helperText="This is for reference when adding rooms." value={floors} onChange={(e) => setFloors(Number(e.target.value))} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <KButton variant="text" onClick={onCancel} disabled={pending}>Cancel</KButton>
        <KButton
          loading={pending}
          disabled={!name.trim()}
          onClick={() => onSave({ name, gender, floors })}
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
        <BentoItem span={2} spanXs={1}><MetricTile label="Awaiting allocation" value={occupancy.notSelected} icon="person_off" emphasis /></BentoItem>
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
  const [filter, setFilter] = useState<"all" | "applied" | "no_application" | "single" | "double" | "flexible" | "allocated">("all")
  const [search, setSearch] = useState("")
  const [detail, setDetail] = useState<StudentData | null>(null)
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
    if (filter === "applied" && !s.applicationStatus) return false
    if (filter === "no_application" && s.applicationStatus) return false
    if (filter === "single" && s.applicationType !== "single") return false
    if (filter === "double" && s.applicationType !== "double") return false
    if (filter === "flexible" && s.applicationType !== "flexible") return false
    if (filter === "allocated" && !s.room) return false
    if (search && !`${s.matricId} ${s.name}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        <b>How to use this page:</b> review each request, open <b>View details</b> for the full student profile, allocate rooms after the application period closes, then publish the results.
      </Alert>
      <Bento sx={{ mb: 2 }}>
        <BentoItem span={2} spanXs={1}><MetricTile label="Total students" value={students.length} icon="groups" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Applications" value={students.filter((s) => s.applicationStatus).length} icon="assignment_turned_in" /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="KIV" value={students.filter((s) => !s.applicationStatus).length} icon="help" emphasis /></BentoItem>
        <BentoItem span={2} spanXs={1}><MetricTile label="Allocated" value={students.filter((s) => s.room).length} icon="meeting_room" /></BentoItem>
      </Bento>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField size="small" placeholder="Search matric or name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
        {(["all", "applied", "no_application", "single", "double", "flexible", "allocated"] as const).map((f) => (
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
            {f === "all" ? "All" : f === "applied" ? "Applied" : f === "no_application" ? "KIV" : f === "single" ? "Single" : f === "double" ? "Double" : f === "flexible" ? "Flexible" : "Allocated"}
          </Box>
        ))}
      </Box>

      {!deadlinePassed && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Applications are collected until the deadline. Final allocation unlocks after it closes. Students without an application remain KIV for admin review.
        </Alert>
      )}

      {filtered.length === 0 ? (
        <KEmpty icon="group" title="No one here" body="No students match this filter, or no intake is active." />
      ) : (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow>
                <TableCell>Matric</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Profile</TableCell>
                <TableCell>Application</TableCell>
                <TableCell>Roommate</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.matricId}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ display: "block" }}>{s.gender} · {s.race ?? "—"}</Typography>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>{s.religion ?? "—"} · {s.nationality}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                      {s.isB40 && <MiniTag label="B40" />}
                      {s.isOku && <MiniTag label="OKU" />}
                      {s.isUniform && <MiniTag label="Uniform" />}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {s.applicationStatus ? <Box><MiniTag label={`${s.applicationType} · ${s.applicationStatus.replaceAll("_", " ")}`} /><Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>{s.faculty ?? "—"} · Merit {s.merit ?? "—"}</Typography></Box> : <Typography variant="body2" sx={{ color: "text.disabled" }}>KIV · no preference</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="caption">{s.roommate ?? "—"}</Typography></TableCell>
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
                    <KButton size="small" variant="text" onClick={() => setDetail(s)}>View details</KButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      <StudentDetailDialog student={detail} freeBeds={freeBeds} deadlinePassed={deadlinePassed} notify={notify} onClose={() => setDetail(null)} />
    </Box>
  )
}

function StudentDetailDialog({ student, freeBeds, deadlinePassed, notify, onClose }: {
  student: StudentData | null
  freeBeds: { id: string; label: string; gender: Gender }[]
  deadlinePassed: boolean
  notify: (m: string, s?: "success" | "error") => void
  onClose: () => void
}) {
  if (!student) return null
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: { xs: 1.5, sm: 2 } } } }}>
    <DialogTitle sx={{ fontWeight: 650 }}>Student details</DialogTitle>
    <DialogContent>
      <Typography variant="h6" sx={{ mb: 0.25 }}>{student.name}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>{student.matricId} · {student.gender}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, mb: 2 }}>
        <Detail label="Race" value={student.race} />
        <Detail label="Religion" value={student.religion} />
        <Detail label="Nationality" value={student.nationality} />
        <Detail label="Faculty" value={student.faculty} />
        <Detail label="Year" value={student.yearOfStudy} />
        <Detail label="Current college" value={student.currentCollege} />
        <Detail label="Merit" value={student.merit === null ? null : String(student.merit)} />
        <Detail label="Roommate" value={student.roommate} />
        <Detail label="Request" value={student.applicationStatus ? `${student.applicationType} · ${student.applicationStatus.replaceAll("_", " ")}` : "KIV"} />
      </Box>
      <Box sx={{ display: "flex", gap: 0.5, mb: 2 }}>{student.isB40 && <MiniTag label="B40" />}{student.isOku && <MiniTag label="OKU" />}{student.isUniform && <MiniTag label="Uniform" />}</Box>
      <Alert severity={student.room ? "success" : "info"} sx={{ borderRadius: 2 }}>{student.room ? `Allocated: ${student.room}` : "No room allocated yet."}</Alert>
      <Box sx={{ mt: 2, p: 1.5, border: "1px solid", borderColor: deadlinePassed ? "primary.light" : "divider", borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 650, mb: 0.35 }}>{student.room ? "Change room assignment" : "Assign a room"}</Typography>
        {deadlinePassed ? <><Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>{student.room ? "Choose a new vacant bed. The current room will be released after the change is saved." : "Choose a vacant bed for this student. A confirmed roommate pair must be placed together in one double room."}</Typography><AssignControl studentId={student.id} beds={freeBeds.filter((b) => b.gender === student.gender)} notify={(message, severity) => { notify(message, severity); if (severity !== "error") onClose() }} /></> : <Alert severity="info" sx={{ borderRadius: 2 }}>Room assignment is available after the application period closes. You can review this student now.</Alert>}
       </Box>
    </DialogContent>
    <DialogActions><KButton variant="text" onClick={onClose}>Close</KButton></DialogActions>
  </Dialog>
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>{label}</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{value || "—"}</Typography></Box>
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

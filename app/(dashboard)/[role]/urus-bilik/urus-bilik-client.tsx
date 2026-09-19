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
import { bedWord } from "@/lib/bilik-format"
import {
  previewImport,
  confirmImport,
  activateIntake,
  renameIntake,
  saveWindow,
  saveRoomFees,
  upsertBlock,
  createRoom,
  deleteRoom,
  generateFloor,
  setRoomStatus,
  setRoomsStatus,
  updateRoomType,
  adminAssign,
  setAllocationsPublished,
  previewSync,
  applySync,
  getSheetConfigView,
  saveSheetConfig,
  fetchGoogleSheetCsv,
  type ImportPreview,
} from "./actions"
import type { SyncPreview } from "@/lib/bilik-sync"
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
    beds: { id: string; position: string; reserved: boolean; occupant: { id: string; name: string; matricId: string } | null }[]
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
  checkInStatus: "checked_out" | "checked_in" | "not_checked_in"
  /** UKM Real Estate registration (deposit paid at the counter). */
  isRegistered: boolean
  /** Tenancy period from UKM RE — read-only in KIZ. */
  contractStart: string | null
  contractEnd: string | null
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
/** Admin-set monthly room fees in RM (per student). Null when not configured. */
interface FeesData {
  single: number | null
  double: number | null
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
  windowClosed,
  fees,
}: {
  readOnly: boolean
  window: WindowData | null
  intakes: IntakeData[]
  blocks: BlockData[]
  students: StudentData[]
  occupancy: OccupancySummary
  freeBeds: { id: string; label: string; gender: Gender }[]
  allocationsPublished: boolean
  windowClosed: boolean
  fees: FeesData
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
        <Tab label="Senarai pelajar" value={3} />
      </Tabs>

      {tab === 0 && !readOnly && (
        <StudentsTab students={students} freeBeds={freeBeds} window={win} notify={notify} />
      )}
      {tab === 1 && !readOnly && <Box><IntakeTab intakes={intakes} notify={notify} /><WindowTab window={win} fees={fees} allocationsPublished={allocationsPublished} windowClosed={windowClosed} notify={notify} /></Box>}
      {tab === 2 && <Box>{!readOnly && <BuildingTab blocks={blocks} students={students} notify={notify} />}<OccupancyTab blocks={blocks} occupancy={occupancy} /></Box>}
      {tab === 3 && <StudentListTab students={students} />}

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
function ImportStatusChip({ status }: { status: "ok" | "duplicate" | "invalid" | "existing" | "room" | "occupant" | "empty" }) {
  const map = {
    ok: { tone: color.success, label: "OK" },
    room: { tone: color.info, label: "Room" },
    occupant: { tone: color.warning, label: "Occupant" },
    duplicate: { tone: color.warning, label: "Dup" },
    invalid: { tone: color.danger, label: "Invalid" },
    existing: { tone: color.neutral, label: "Listed" },
    empty: { tone: color.neutral, label: "Empty" },
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
    if (/\.xlsx?$/i.test(file.name)) {
      notify("That's an Excel file — export it as CSV first (File → Save As → CSV UTF-8), then upload the .csv.", "error")
      return
    }
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
        const roomNote = res.roomsCreated
          ? ` ${res.roomsCreated} rooms created${res.flaggedRooms ? ` (${res.flaggedRooms} flagged)` : ""}.`
          : ""
        const releaseNote = res.releasedAllocations ? ` ${res.releasedAllocations} old allocation(s) released.` : ""
        notify(`Nice! ${res.imported} students imported.${roomNote}${releaseNote} Activate the intake to open selection.`)
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
        subtitle="Export the KIZ / eKolej sheet to CSV. Columns: BLOCK, ROOM, NO.MATRIK, NAME, COUNTRY, FAC, RELIGION. Gender is derived from the block; single vs twin rooms and damaged / reserved rooms are detected automatically."
        icon="upload_file"
      >
        <Alert severity="info" icon={<KIcon icon="meeting_room" size={18} />} sx={{ mb: 2, borderRadius: 2 }}>
          <b>Rooms included:</b> each room is read from the <b>BLOCK</b> + <b>ROOM</b> columns
          (e.g. K18A + 101 → K18A-101). One bed row = single room, two = twin. A row whose
          name starts with <b>ROSAK</b>, <b>BILIK GANTIAN</b> or <b>KEGUNAAN LAIN</b> creates
          that room as maintenance / closed. Blank bed rows are skipped.
        </Alert>
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
            <BentoItem span={3} spanXs={1}><MetricTile label="Students" value={preview.studentCount} icon="check_circle" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Rooms" value={preview.roomCount} icon="meeting_room" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Flagged rooms" value={preview.flaggedCount} icon="build" /></BentoItem>
            <BentoItem span={3} spanXs={1}><MetricTile label="Invalid" value={preview.invalidCount} icon="error" /></BentoItem>
          </Bento>

          <Alert severity="info" icon={<KIcon icon="rule" size={18} />} sx={{ mb: 2, borderRadius: 2 }}>
            <b>{preview.studentCount}</b> students and <b>{preview.roomCount}</b> rooms
            will be created
            {preview.flaggedCount > 0
              ? ` (${preview.flaggedCount} damaged / reserved / staff ${preview.flaggedCount === 1 ? "room" : "rooms"} get a non-available status)`
              : ""}
            . Invalid rows, in-file duplicates, blank beds, and matric numbers already
            in the active intake are skipped automatically.
            {preview.occupantCount > 0
              ? ` ${preview.occupantCount} bed rows held by non-student residents (Pengetua / mobility / staff) are created as reserved beds — never assigned to a student.`
              : ""}
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
                  <TableCell>Room</TableCell>
                  <TableCell>Type</TableCell>
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
                    <TableCell>{r.room ?? "—"}</TableCell>
                    <TableCell>
                      {r.roomType === "single" ? "Single" : r.roomType === "double" ? "Twin" : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
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
                            : r.status === "room"
                              ? r.reason ?? "Flagged room"
                              : r.status === "occupant"
                                ? r.reason ?? "Non-student resident"
                                : r.status === "empty"
                                  ? "Blank bed"
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
            <KButton onClick={onConfirm} loading={pending} icon="download_done" disabled={preview.studentCount === 0 && preview.flaggedCount === 0}>
              Import {preview.studentCount} {preview.studentCount === 1 ? "student" : "students"}
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
                <RenameIntakeButton intake={i} notify={notify} />
                {i.status !== "active" && (
                  <ActivateButton intakeId={i.id} notify={notify} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </FormSection>

      <SyncSection notify={notify} />
    </Box>
  )
}

// ── Sync from Google Sheet / CSV ─────────────────────────────────────────────

function SyncSection({ notify }: { notify: (m: string, s?: "success" | "error") => void }) {
  const [hasKey, setHasKey] = useState(false)
  const [serviceAccount, setServiceAccount] = useState("")
  const [spreadsheetId, setSpreadsheetId] = useState("")
  const [range, setRange] = useState("")
  const [csv, setCsv] = useState("")
  const [source, setSource] = useState("")
  const [preview, setPreview] = useState<SyncPreview | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSheetConfigView()
      .then((cfg) => {
        setHasKey(cfg.hasServiceAccount)
        setSpreadsheetId(cfg.spreadsheetId)
        setRange(cfg.range)
      })
      .catch(() => {})
  }, [])

  const saveConfig = () => start(async () => {
    try {
      await saveSheetConfig({ serviceAccount: serviceAccount.trim() || undefined, spreadsheetId, range })
      setServiceAccount("")
      const cfg = await getSheetConfigView()
      setHasKey(cfg.hasServiceAccount)
      setSpreadsheetId(cfg.spreadsheetId)
      setRange(cfg.range)
      notify("Google Sheet config saved.")
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not save config", "error")
    }
  })

  const previewFromSheet = () => start(async () => {
    const res = await fetchGoogleSheetCsv()
    if (!res.ok || !res.csv) {
      notify(res.error ?? "Could not read the sheet", "error")
      return
    }
    setCsv(res.csv)
    setSource("Google Sheet")
    try {
      setPreview(await previewSync(res.csv))
    } catch (e) {
      notify(e instanceof Error ? e.message : "Preview failed", "error")
    }
  })

  const onFile = async (file: File) => {
    if (/\.xlsx?$/i.test(file.name)) {
      notify("Export the sheet as CSV first, or use the Google Sheet button.", "error")
      return
    }
    const text = await file.text()
    setCsv(text)
    setSource(file.name)
    start(async () => {
      try {
        setPreview(await previewSync(text))
      } catch (e) {
        notify(e instanceof Error ? e.message : "Preview failed", "error")
      }
    })
  }

  const apply = () => start(async () => {
    const res = await applySync(csv)
    if (res.ok) {
      notify(`Sync done — ${res.added ?? 0} added, ${res.moved ?? 0} moved, ${res.removed ?? 0} removed, ${res.roomsSynced ?? 0} rooms synced.`)
      setPreview(null)
      setCsv("")
      setSource("")
    } else {
      notify(res.error ?? "Sync failed", "error")
    }
  })

  return (
    <FormSection
      title="Sync from Google Sheet"
      subtitle="Update the active intake in place — students who changed rooms, new students, and room status changes. Nothing is applied until you review the diff and press Apply sync."
      icon="sync"
    >
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        <b>How sync works:</b> the sheet is the source of truth. A student&apos;s room follows
        their matric number — a new matric is added, a changed room is moved, and a matric
        no longer in the sheet is <b>removed from the list</b> (soft-deleted, recoverable).
        Room type, damaged / reserved status and reserved beds are reconciled too.
      </Alert>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <TextField label="Spreadsheet ID" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="1AbC...xyz" helperText="The long ID in the sheet URL between /d/ and /edit." />
        <TextField label="Range / tab" value={range} onChange={(e) => setRange(e.target.value)} placeholder="Sheet1" helperText="Tab name, e.g. Sheet1 (or Sheet1!A1:Z1000)." />
      </Box>
      <TextField
        label={hasKey ? "Service account JSON (leave blank to keep current)" : "Service account JSON"}
        value={serviceAccount}
        onChange={(e) => setServiceAccount(e.target.value)}
        placeholder={hasKey ? "•••••• configured ••••••" : '{ "type": "service_account", ... }'}
        multiline
        minRows={2}
        fullWidth
        sx={{ mt: 2 }}
        helperText={hasKey ? "A key is already saved. Paste a new one to replace it." : "Paste the whole JSON key file from Google Cloud."}
      />
      <Box sx={{ mt: 1.5 }}>
        <KButton size="small" variant="outlined" loading={pending} onClick={saveConfig} icon="save">Save config</KButton>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <KButton onClick={previewFromSheet} loading={pending} icon="cloud_download">Preview from Google Sheet</KButton>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <KButton variant="outlined" onClick={() => inputRef.current?.click()} icon="upload_file">Preview from CSV</KButton>
      </Box>

      {preview && (
        <Box sx={{ mt: 2 }}>
          <Bento sx={{ mb: 2 }}>
            <BentoItem span={2} spanXs={1}><MetricTile label="Add" value={preview.toAdd.length} icon="person_add" /></BentoItem>
            <BentoItem span={2} spanXs={1}><MetricTile label="Move" value={preview.toMove.length} icon="swap_horiz" /></BentoItem>
            <BentoItem span={2} spanXs={1}><MetricTile label="Remove" value={preview.toRemove.length} icon="person_remove" /></BentoItem>
            <BentoItem span={2} spanXs={1}><MetricTile label="Unchanged" value={preview.unchanged} icon="check_circle" /></BentoItem>
            <BentoItem span={2} spanXs={1}><MetricTile label="Rooms new" value={preview.roomsNew} icon="meeting_room" /></BentoItem>
            <BentoItem span={2} spanXs={1}><MetricTile label="Rooms changed" value={preview.roomsChanged} icon="edit" /></BentoItem>
          </Bento>

          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
            Source: <b>{source}</b> · intake: <b>{preview.intakeName ?? "—"}</b> · {preview.studentsInSheet} students · {preview.roomsTotal} rooms ({preview.reservedRooms} with reserved beds)
          </Typography>

          <SyncDiffList title="To move" tone={color.info} items={preview.toMove.map((m) => `${m.name} (${m.matricId}): ${m.from} → ${m.to}`)} />
          <SyncDiffList title="To add" tone={color.success} items={preview.toAdd.map((m) => `${m.name} (${m.matricId}) → ${m.room}`)} />
          <SyncDiffList title="To remove (no longer in sheet)" tone={color.warning} items={preview.toRemove.map((m) => `${m.name} (${m.matricId})`)} />

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <KButton onClick={apply} loading={pending} icon="sync">Apply sync</KButton>
            <KButton variant="outlined" onClick={() => { setPreview(null); setCsv(""); setSource("") }}>Cancel</KButton>
          </Box>
        </Box>
      )}
    </FormSection>
  )
}

function SyncDiffList({ title, tone, items }: { title: string; tone: { soft: string; ink: string; main: string }; items: string[] }) {
  if (items.length === 0) return null
  const shown = items.slice(0, 20)
  return (
    <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, backgroundColor: tone.soft, border: "1px solid", borderColor: tone.main }}>
      <Typography sx={{ fontWeight: 700, color: tone.ink, mb: 0.5 }}>{title} ({items.length})</Typography>
      {shown.map((line, i) => (
        <Typography key={i} variant="caption" sx={{ display: "block", color: tone.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line}</Typography>
      ))}
      {items.length > shown.length && <Typography variant="caption" sx={{ color: tone.ink }}>…and {items.length - shown.length} more</Typography>}
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

function RenameIntakeButton({ intake, notify }: { intake: IntakeData; notify: (m: string, s?: "success" | "error") => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(intake.name)
  const [pending, start] = useTransition()

  const save = () => start(async () => {
    try {
      await renameIntake(intake.id, name)
      setOpen(false)
      notify("Intake renamed.")
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not rename intake", "error")
    }
  })

  return (
    <>
      <IconButtonSmall
        title={`Rename ${intake.name}`}
        icon="edit"
        onClick={() => { setName(intake.name); setOpen(true) }}
      />
      {open && (
        <Dialog open onClose={() => setOpen(false)} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: 2 } } }}>
          <DialogTitle sx={{ fontWeight: 640, letterSpacing: "-0.02em" }}>Rename intake</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Intake name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) save() }}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <KButton variant="text" onClick={() => setOpen(false)} disabled={pending}>Cancel</KButton>
            <KButton loading={pending} disabled={!name.trim() || name.trim() === intake.name} onClick={save}>Save</KButton>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

// ── Tab 2: Window ───────────────────────────────────────────────────────────

function WindowTab({
  window: win,
  fees,
  allocationsPublished,
  windowClosed,
  notify,
}: {
  window: WindowData | null
  fees: FeesData
  allocationsPublished: boolean
  windowClosed: boolean
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

      <RoomFeesSection fees={fees} notify={notify} />
      <AllocationPublishSection published={allocationsPublished} windowClosed={windowClosed} closesAt={win?.closesAt ?? null} notify={notify} />
    </Box>
  )
}

function RoomFeesSection({ fees, notify }: { fees: FeesData; notify: (m: string, s?: "success" | "error") => void }) {
  const [single, setSingle] = useState(fees.single != null ? String(fees.single) : "")
  const [double, setDouble] = useState(fees.double != null ? String(fees.double) : "")
  const [pending, start] = useTransition()

  const parseInput = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isNaN(n) ? NaN : n
  }

  const save = () => {
    const s = parseInput(single)
    const d = parseInput(double)
    if ((s !== null && Number.isNaN(s)) || (d !== null && Number.isNaN(d))) {
      notify("Enter fees as numbers (e.g. 750) or leave blank.", "error")
      return
    }
    if (s !== null && s < 0) { notify("Single room fee can't be negative.", "error"); return }
    if (d !== null && d < 0) { notify("Twin-sharing room fee can't be negative.", "error"); return }
    start(async () => {
      try {
        await saveRoomFees({ single: s, double: d })
        notify("Room fees saved. Students will see the updated rates on their Room Selection page.")
      } catch (e) {
        notify(e instanceof Error ? e.message : "Could not save room fees", "error")
      }
    })
  }

  return (
    <FormSection title="Room fees" subtitle="Monthly rate per student for each room type, shown on the students' Room Selection page." icon="payments">
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
        A <b>one-month deposit</b> applies on top of the first month&apos;s rent. Students see the rate and this note before choosing.
      </Alert>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mb: 2.5 }}>
        <TextField fullWidth label="Single Room · RM per month" value={single} onChange={(e) => setSingle(e.target.value)} inputMode="decimal" placeholder="e.g. 750" helperText="Leave blank to hide the rate." />
        <TextField fullWidth label="Twin-Sharing Room · RM per month" value={double} onChange={(e) => setDouble(e.target.value)} inputMode="decimal" placeholder="e.g. 450" helperText="Per student — two students split the room." />
      </Box>
      <KButton onClick={save} loading={pending} icon="save">
        Save room fees
      </KButton>
    </FormSection>
  )
}

function AllocationPublishSection({ published, windowClosed, closesAt, notify }: { published: boolean; windowClosed: boolean; closesAt: string | null; notify: (m: string, s?: "success" | "error") => void }) {
  const [pending, start] = useTransition()
  const locked = !windowClosed && !published
  return <FormSection title="Show room results to students" subtitle="Students only see their assigned room after you publish. Assign rooms any time — publishing is what reveals them." icon="visibility">
    <Alert severity={published ? "success" : "info"} sx={{ mb: 2, borderRadius: 2 }}>
      {published ? <><b>Room results are now visible.</b> Students can see their assigned room number on the Room Selection page.</> : locked ? <><b>Room results are still hidden.</b> Publishing unlocks after the application period closes{closesAt ? <> on <b>{new Intl.DateTimeFormat("en-MY", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(closesAt))}</b></> : null}. You can keep assigning rooms until then.</> : <><b>Room results are still hidden.</b> The application period has closed — you can publish the completed allocation now.</>}
    </Alert>
    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>When all assignments are complete, click the button below once. The system will not allow you to publish while any student is still waiting for a room.</Typography>
    <KButton loading={pending} disabled={locked} color={published ? "warning" : "primary"} variant={published ? "outlined" : "contained"} onClick={() => start(async () => { try { await setAllocationsPublished(!published); notify(!published ? "Room results are now visible to students." : "Room results are hidden again.") } catch (e) { notify(e instanceof Error ? e.message : "Could not update room-result visibility", "error") } })}>{published ? "Hide room results" : "Publish room results"}</KButton>
    {locked && <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>Publishing is locked until the application period closes.</Typography>}
  </FormSection>
}

// ── Tab 3: Building ──────────────────────────────────────────────────────────

function BuildingTab({
  blocks,
  students,
  notify,
}: {
  blocks: BlockData[]
  students: StudentData[]
  notify: (m: string, s?: "success" | "error") => void
}) {
  const [pending, start] = useTransition()
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id ?? "")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<RoomStatus>("maintenance")
  const [showAdd, setShowAdd] = useState(false)
  const [manageRoom, setManageRoom] = useState<BlockData["rooms"][number] | null>(null)
  // add-block form
  const [newName, setNewName] = useState("")
  const [newGender, setNewGender] = useState<Gender>("male")
  const [newFloors, setNewFloors] = useState(4)
  const [newSort, setNewSort] = useState(blocks.length)
  // add-room form
  const [roomBlock, setRoomBlock] = useState(blocks[0]?.id ?? "")
  const [roomNumber, setRoomNumber] = useState("")
  const [roomType, setRoomType] = useState<RoomType>("double")
  // generate-floor form
  const [genBlock, setGenBlock] = useState(blocks[0]?.id ?? "")
  const [genFloor, setGenFloor] = useState(1)
  const [genCount, setGenCount] = useState(10)
  const [genType, setGenType] = useState<RoomType>("double")
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
        await createRoom({ blockId: roomBlock, number: roomNumber.trim(), type: roomType })
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
        {activeRooms.length === 0 ? <KEmpty compact icon="meeting_room" title="No rooms in this block" body="Use Add rooms to create the first room or generate a whole floor." /> : <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" } }}>{activeRooms.map((room) => <RoomInventoryCard key={room.id} room={room} selected={selectedRoomIds.includes(room.id)} onToggle={() => toggleRoom(room.id)} onStatus={(status) => start(async () => { await setRoomStatus(room.id, status); notify(`${room.number} is now ${status}.`) })} onType={(type) => start(async () => { try { await updateRoomType(room.id, type); notify(`${room.number} is now a ${type === "single" ? "single" : "twin"} room.`) } catch (e) { notify(e instanceof Error ? e.message : "Could not change room type", "error") } })} onDelete={() => onDeleteRoom(activeBlock, room)} onManage={() => setManageRoom(room)} />)}</Box>}
      </FormSection>}
      {showAdd && <Box>
      <FormSection title="Add a block" subtitle="Only use this when a new residence block is opened." icon="add_home">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
          <TextField label="Block name" placeholder="e.g. K20A" value={newName} onChange={(e) => setNewName(e.target.value)} />
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

      <FormSection title="Add one room" subtitle="Beds are created automatically. The room number is the full code (block · floor · room) and the floor is read from it." icon="add_business">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" } }}>
          <TextField select size="small" label="Block" value={roomBlock} onChange={(e) => setRoomBlock(e.target.value)}>
            {blocks.length === 0 ? <MenuItem value="" disabled>No blocks yet</MenuItem> : blocks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <TextField label="Room number" placeholder={activeBlock ? `e.g. ${activeBlock.name}-101` : "e.g. K18A-101"} helperText="Code or just the number — e.g. K18A-101 or 101 for floor 1, room 01." value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
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

      <FormSection title="Add many rooms at once" subtitle="Use this for a new floor. The system creates the rooms and beds automatically with full codes." icon="grid_on">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
          <TextField select size="small" label="Block" value={genBlock} onChange={(e) => setGenBlock(e.target.value)}>
            {blocks.length === 0 ? <MenuItem value="" disabled>No blocks yet</MenuItem> : blocks.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>
          <TextField type="number" size="small" label="Floor" value={genFloor} onChange={(e) => setGenFloor(Number(e.target.value))} />
          <TextField type="number" size="small" label="Rooms" value={genCount} onChange={(e) => setGenCount(Number(e.target.value))} />
          <TextField select size="small" label="Type" value={genType} onChange={(e) => setGenType(e.target.value as RoomType)}>
            <MenuItem value="single">Single</MenuItem>
            <MenuItem value="double">Double</MenuItem>
          </TextField>
        </Box>
        <Box sx={{ mt: 2 }}>
          <KButton
            loading={pending}
            icon="grid_on"
            disabled={!genBlock}
            onClick={() => start(async () => {
              try {
                await generateFloor({ blockId: genBlock, floor: genFloor, count: genCount, type: genType })
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

      <RoomOccupantsDialog room={manageRoom} students={students} notify={notify} onClose={() => setManageRoom(null)} />

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

function RoomInventoryCard({ room, selected, onToggle, onStatus, onType, onDelete, onManage }: { room: BlockData["rooms"][number]; selected: boolean; onToggle: () => void; onStatus: (status: RoomStatus) => void; onType: (type: RoomType) => void; onDelete: () => void; onManage: () => void }) {
  const tone = room.status === "available" ? "success" : room.status === "maintenance" ? "warning" : "danger"
  const typeLabel = room.type === "single" ? "Single" : "Twin"
  return <Box sx={{ p: 1.5, border: "1px solid", borderColor: selected ? "primary.main" : "divider", borderRadius: 2, backgroundColor: selected ? "action.selected" : "background.paper" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}><Checkbox size="small" checked={selected} onChange={onToggle} /><Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontWeight: 700 }} noWrap>{room.number}</Typography><Typography variant="caption" sx={{ color: "text.secondary" }}>Floor {room.floor} · {typeLabel} · {room.occupiedBeds}/{room.totalBeds} filled</Typography></Box><IconButtonSmall title={`Delete ${room.number}`} icon="delete" danger onClick={onDelete} /></Box>
    <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) minmax(0,1fr)", alignItems: "center", gap: 0.75, mt: 1 }}><StatusChip tone={tone} /><TextField select size="small" value={room.status} onChange={(event) => onStatus(event.target.value as RoomStatus)} sx={{ "& .MuiInputBase-input": { py: 0.45, fontSize: 12 } }}><MenuItem value="available">Available</MenuItem><MenuItem value="maintenance">Maintenance</MenuItem><MenuItem value="closed">Closed</MenuItem></TextField><TextField select size="small" value={room.type} onChange={(event) => onType(event.target.value as RoomType)} title="Room type" sx={{ "& .MuiInputBase-input": { py: 0.45, fontSize: 12 } }}><MenuItem value="single">Single</MenuItem><MenuItem value="double">Twin</MenuItem></TextField></Box>
    <Box sx={{ mt: 1.25, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>{room.beds.map((bed) => <Typography key={bed.id} variant="caption" sx={{ display: "block", color: bed.occupant ? "text.primary" : bed.reserved ? "warning.main" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bedWord(bed.position)}: {bed.occupant ? bed.occupant.name : bed.reserved ? "Reserved" : "Empty"}</Typography>)}<KButton size="small" variant="text" sx={{ mt: 0.5, px: 0 }} onClick={onManage}>Manage occupants</KButton></Box>
  </Box>
}

function RoomOccupantsDialog({ room, students, notify, onClose }: {
  room: BlockData["rooms"][number] | null
  students: StudentData[]
  notify: (m: string, s?: "success" | "error") => void
  onClose: () => void
}) {
  const [studentId, setStudentId] = useState("")
  const [bedId, setBedId] = useState("")
  const [pending, start] = useTransition()
  if (!room) return null
  const emptyBeds = room.beds.filter((bed) => !bed.occupant && !bed.reserved)
  const candidates = students
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: 2 } } }}>
    <DialogTitle sx={{ fontWeight: 650 }}>Manage occupants: {room.number}</DialogTitle>
    <DialogContent>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>Assign an unallocated student to an empty bed here. Moving a student releases their previous room automatically. Students won&apos;t see the assignment until you publish the results.</Alert>
      <Box sx={{ display: "grid", gap: 1, mb: 2 }}>{room.beds.map((bed) => <Box key={bed.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Typography sx={{ fontWeight: 650 }}>{bedWord(bed.position)}</Typography>{bed.occupant ? <Typography variant="body2">{bed.occupant.name} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({bed.occupant.matricId})</Typography></Typography> : bed.reserved ? <Typography variant="body2" sx={{ color: "warning.main" }}>Reserved (emergency / quota)</Typography> : <Typography variant="body2" sx={{ color: "text.disabled" }}>Empty</Typography>}</Box>)}</Box>
      {emptyBeds.length > 0 && <Box sx={{ display: "grid", gap: 1.5 }}><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Add or move a student</Typography><TextField select fullWidth label="Student" value={studentId} onChange={(event) => setStudentId(event.target.value)} helperText="Choosing someone with a current room will move them here and release their old room."><MenuItem value="">Choose a student</MenuItem>{candidates.map((student) => <MenuItem key={student.id} value={student.id}>{student.name} · {student.matricId}{student.room ? ` · currently ${student.room}` : " · no room yet"}</MenuItem>)}</TextField><TextField select fullWidth label="Empty bed" value={bedId} onChange={(event) => setBedId(event.target.value)}><MenuItem value="">Choose an empty bed</MenuItem>{emptyBeds.map((bed) => <MenuItem key={bed.id} value={bed.id}>{bedWord(bed.position)}</MenuItem>)}</TextField><KButton loading={pending} disabled={!studentId || !bedId} onClick={() => start(async () => { const result = await adminAssign(studentId, bedId); notify(result.ok ? "Student assigned to this room." : result.error ?? "Could not assign student.", result.ok ? "success" : "error"); if (result.ok) onClose() })}>Save room assignment</KButton></Box>}
      {emptyBeds.length === 0 && <Alert severity="info" sx={{ borderRadius: 2 }}>This room is full. Use another room or move an occupant first.</Alert>}
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
        <BentoItem span={3} spanXs={1}><MetricTile label="Occupancy" value={`${occupancy.occupancyPct}%`} icon="donut_large" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Filled" value={occupancy.filled} icon="bed" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Free" value={occupancy.free} icon="chair" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Reserved" value={occupancy.reserved} icon="lock" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Maintenance" value={occupancy.maintenance} icon="build" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Total beds" value={occupancy.totalBeds} icon="king_bed" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Awaiting allocation" value={occupancy.notSelected} icon="person_off" emphasis /></BentoItem>
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

// ── Senarai pelajar (full roster, read-only) ────────────────────────────────

/** UKM RE contract date (ISO) → dd/mm/yyyy in Malaysia time. */
function formatContractDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(d)
}

function StudentListTab({ students }: { students: StudentData[] }) {
  const [filter, setFilter] = useState<"all" | "registered" | "not_registered" | "no_room">("all")
  const [search, setSearch] = useState("")

  const filtered = students.filter((s) => {
    if (filter === "registered" && !s.isRegistered) return false
    if (filter === "not_registered" && s.isRegistered) return false
    if (filter === "no_room" && s.room) return false
    if (search && !`${s.matricId} ${s.name} ${s.faculty ?? ""} ${s.room ?? ""}`.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const registered = students.filter((s) => s.isRegistered).length
  const registeredMale = students.filter((s) => s.isRegistered && s.gender === "male").length
  const registeredFemale = students.filter((s) => s.isRegistered && s.gender === "female").length

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Senarai penuh pelajar intake aktif. <b>Mendaftar</b> bermaksud pelajar sudah ke kaunter UKM Real
        Estate, daftar dan bayar deposit — KIZ hanya menentukan bilik. Tarikh kontrak datang dari sheet
        UKM RE dan tidak boleh diubah di sini.
      </Alert>
      <Bento sx={{ mb: 2 }}>
        <BentoItem span={4} spanXs={1}><MetricTile label="Jumlah pelajar" value={students.length} icon="groups" /></BentoItem>
        <BentoItem span={4} spanXs={1}><MetricTile label="Mendaftar" value={registered} icon="how_to_reg" /></BentoItem>
        <BentoItem span={4} spanXs={1}><MetricTile label="Belum mendaftar" value={students.length - registered} icon="pending" /></BentoItem>
        <BentoItem span={6} spanXs={1}><MetricTile label="Mendaftar Lelaki" value={registeredMale} icon="man" /></BentoItem>
        <BentoItem span={6} spanXs={1}><MetricTile label="Mendaftar Perempuan" value={registeredFemale} icon="woman" /></BentoItem>
      </Bento>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          placeholder="Cari matric, nama, fakulti atau bilik"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
        />
        {(["all", "registered", "not_registered", "no_room"] as const).map((f) => (
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
            {f === "all" ? "Semua" : f === "registered" ? "Mendaftar" : f === "not_registered" ? "Belum mendaftar" : "Tiada bilik"}
          </Box>
        ))}
      </Box>

      {filtered.length === 0 ? (
        <KEmpty icon="group" title="Tiada pelajar" body="Tiada pelajar sepadan dengan carian atau filter, atau tiada intake aktif." />
      ) : (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: `${radius.card}px`, overflow: "auto", backgroundColor: "background.paper", "& .MuiTableCell-root": { fontSize: "0.8125rem" }, "& .MuiTableCell-head": { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }, "& .MuiTableRow-root:hover": { backgroundColor: "rgba(9,9,11,0.035)" } }}>
          <Table size="small" sx={{ minWidth: 980 }}>
            <TableHead>
              <TableRow>
                <TableCell>Matric</TableCell>
                <TableCell>Nama</TableCell>
                <TableCell>Fakulti</TableCell>
                <TableCell>Bilik · Katil</TableCell>
                <TableCell>Rakan sebilik</TableCell>
                <TableCell>Mendaftar</TableCell>
                <TableCell>Tempoh kontrak</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => {
                const start = formatContractDate(s.contractStart)
                const end = formatContractDate(s.contractEnd)
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.matricId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{s.gender} · {s.nationality}</Typography>
                    </TableCell>
                    <TableCell>{s.faculty ?? "—"}</TableCell>
                    <TableCell>
                      {s.room ? (
                        <Typography variant="body2">{s.room}</Typography>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.disabled" }}>Belum diassign</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="caption">{s.roommate ?? "—"}</Typography></TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "inline-block", px: 0.75, py: 0.125, borderRadius: 1, fontSize: 10, fontWeight: 700,
                          backgroundColor: s.isRegistered ? color.success.soft : color.brand[50],
                          color: s.isRegistered ? color.success.ink : color.brand[700],
                        }}
                      >
                        {s.isRegistered ? "Mendaftar" : "Belum"}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {start || end ? `${start ?? "—"} – ${end ?? "—"}` : "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  )
}

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
        <BentoItem span={3} spanXs={1}><MetricTile label="Total students" value={students.length} icon="groups" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Applications" value={students.filter((s) => s.applicationStatus).length} icon="assignment_turned_in" /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="KIV" value={students.filter((s) => !s.applicationStatus).length} icon="help" emphasis /></BentoItem>
        <BentoItem span={3} spanXs={1}><MetricTile label="Allocated" value={students.filter((s) => s.room).length} icon="meeting_room" /></BentoItem>
      </Bento>
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField placeholder="Search matric or name" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
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
          Applications are collected until the deadline. You can assign rooms at any time — students stay in the dark until you click <b>Publish</b> on the Cycle setup tab. Students without an application remain KIV for admin review.
        </Alert>
      )}

      {filtered.length === 0 ? (
        <KEmpty icon="group" title="No one here" body="No students match this filter, or no intake is active." />
      ) : (
        <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: `${radius.card}px`, overflow: "auto", backgroundColor: "background.paper", "& .MuiTableCell-root": { fontSize: "0.8125rem" }, "& .MuiTableCell-head": { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }, "& .MuiTableRow-root:hover": { backgroundColor: "rgba(9,9,11,0.035)" } }}>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow>
                <TableCell>Matric</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Profile</TableCell>
                <TableCell>Application</TableCell>
                <TableCell>Roommate</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Check-in</TableCell>
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
                  <TableCell>
                    <CheckInBadge status={s.checkInStatus} />
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
      <StudentDetailDialog student={detail} freeBeds={freeBeds} notify={notify} onClose={() => setDetail(null)} />
    </Box>
  )
}

function StudentDetailDialog({ student, freeBeds, notify, onClose }: {
  student: StudentData | null
  freeBeds: { id: string; label: string; gender: Gender }[]
  notify: (m: string, s?: "success" | "error") => void
  onClose: () => void
}) {
  if (!student) return null
  return <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: `${radius.cardLg}px`, m: { xs: 1.5, sm: 2 } } } }}>
    <DialogTitle sx={{ fontWeight: 650 }}>Student details</DialogTitle>
    <DialogContent>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.25 }}>
        <Typography variant="h6">{student.name}</Typography>
        <CheckInBadge status={student.checkInStatus} />
      </Box>
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
      <Box sx={{ mt: 2, p: 1.5, border: "1px solid", borderColor: "primary.light", borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 650, mb: 0.35 }}>{student.room ? "Change room assignment" : "Assign a room"}</Typography>
        <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
          {student.applicationType === "double" && student.applicationStatus === "roommate_confirmed"
            ? "Both students must be placed together — pick a double room with two free beds."
            : "Pick a free bed for this student. If no single room is left, a shared double room is fine."}
          <br />Students won&apos;t see this room until you publish the results on the Cycle setup tab.
        </Typography>
        <AssignControl studentId={student.id} beds={freeBeds.filter((b) => b.gender === student.gender)} notify={(message, severity) => { notify(message, severity); if (severity !== "error") onClose() }} />
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

/** Check-in / check-out status pill for the current session. */
function CheckInBadge({ status }: { status: "checked_out" | "checked_in" | "not_checked_in" }) {
  const map = {
    checked_in: { label: "Checked in", bg: color.success.soft, fg: color.success.ink, dot: color.success.main },
    checked_out: { label: "Checked out", bg: color.info.soft, fg: color.info.ink, dot: color.info.main },
    not_checked_in: { label: "Not checked in", bg: color.canvasSunk, fg: color.ink[500], dot: color.ink[300] },
  } as const
  const m = map[status]
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 0.875,
        py: 0.25,
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        backgroundColor: m.bg,
        color: m.fg,
        whiteSpace: "nowrap",
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: 999, backgroundColor: m.dot }} />
      {m.label}
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

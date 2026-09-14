"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Button from "@mui/material/Button"
import Alert from "@mui/material/Alert"
import Snackbar from "@mui/material/Snackbar"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import InputAdornment from "@mui/material/InputAdornment"
import CircularProgress from "@mui/material/CircularProgress"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { SmartTable } from "@/components/kiz/patterns/smart-table"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { color, radius } from "@/lib/theme"
import { formatMalaysia } from "@/lib/timezone"
import { toCsv } from "@/lib/csv"
import { buildXlsx } from "@/lib/xlsx"
import {
  createCheckInSession,
  updateCheckInSession,
  setCheckInSessionActive,
  deleteCheckInSession,
  adminLookupStudent,
  adminManualCheckIn,
  uploadCheckinDirectionsImage,
  removeCheckinDirectionsImage,
} from "@/lib/checkin"
import type { GridColDef } from "@mui/x-data-grid"

type TypeVal = "check_in" | "check_out"
type PillTone = "info" | "warning" | "success" | "danger" | "neutral"

interface SessionRow {
  id: string
  name: string
  type: TypeVal
  token: string
  isActive: boolean
  opensAt: string | null
  closesAt: string | null
  createdAt: string
  recordCount: number
  url: string
  qrDataUrl: string
}

interface RecordRow {
  id: string
  sessionId: string
  sessionName: string
  matricId: string
  name: string
  type: TypeVal
  roomLabel: string | null
  signatureUrl: string | null
  /** True when an admin recorded it on the student's behalf (no signature). */
  manual: boolean
  signedAt: string
}

/** One student, with their check-in and (later) check-out merged onto one row. */
interface ConsolidatedRow {
  id: string
  matricId: string
  name: string
  roomLabel: string | null
  checkInAt: string | null
  checkOutAt: string | null
  checkInSession: string | null
  checkOutSession: string | null
  checkInSignatureUrl: string | null
  checkOutSignatureUrl: string | null
  checkInManual: boolean
  checkOutManual: boolean
  /** Session ids the student appears in (for the session filter). */
  sessionIds: string[]
}

/**
 * Merge per-record check-in / check-out rows into one row per student. A
 * student who has only checked in gets an empty check-out — that's expected
 * until the move-out session runs.
 */
function consolidate(records: RecordRow[]): ConsolidatedRow[] {
  const map = new Map<string, ConsolidatedRow>()
  for (const r of records) {
    const key = r.matricId.toUpperCase()
    let row = map.get(key)
    if (!row) {
      row = {
        id: key,
        matricId: r.matricId,
        name: r.name,
        roomLabel: r.roomLabel,
        checkInAt: null,
        checkOutAt: null,
        checkInSession: null,
        checkOutSession: null,
        checkInSignatureUrl: null,
        checkOutSignatureUrl: null,
        checkInManual: false,
        checkOutManual: false,
        sessionIds: [],
      }
      map.set(key, row)
    }
    if (!row.sessionIds.includes(r.sessionId)) row.sessionIds.push(r.sessionId)
    if (r.name) row.name = r.name
    if (r.type === "check_in") {
      // Prefer the check-in record's room snapshot, and the latest time.
      if (r.roomLabel) row.roomLabel = r.roomLabel
      if (!row.checkInAt || new Date(r.signedAt) > new Date(row.checkInAt)) {
        row.checkInAt = r.signedAt
        row.checkInSession = r.sessionName
        row.checkInSignatureUrl = r.signatureUrl
        row.checkInManual = r.manual
      }
    } else {
      if (!row.checkOutAt || new Date(r.signedAt) > new Date(row.checkOutAt)) {
        row.checkOutAt = r.signedAt
        row.checkOutSession = r.sessionName
        row.checkOutSignatureUrl = r.signatureUrl
        row.checkOutManual = r.manual
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const TYPE_META: Record<TypeVal, { label: string; tone: PillTone }> = {
  check_in: { label: "Check-in", tone: "info" },
  check_out: { label: "Check-out", tone: "warning" },
}

function typeLabel(t: TypeVal) {
  return TYPE_META[t].label
}

/** ISO → value for a native datetime-local input (browser-local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Live status of a session's validity window. */
function sessionStatus(s: SessionRow): { label: string; tone: PillTone } {
  if (!s.isActive) return { label: "Inactive", tone: "neutral" }
  const now = Date.now()
  if (s.opensAt && now < new Date(s.opensAt).getTime()) return { label: "Not open yet", tone: "warning" }
  if (s.closesAt && now > new Date(s.closesAt).getTime()) return { label: "Closed", tone: "danger" }
  return { label: "Open now", tone: "success" }
}

function sessionWindowLabel(s: SessionRow): string {
  if (!s.opensAt && !s.closesAt) return "No time limit"
  const from = s.opensAt ? formatMalaysia(new Date(s.opensAt)) : "anytime"
  const to = s.closesAt ? formatMalaysia(new Date(s.closesAt)) : "open-ended"
  return `${from} → ${to}`
}

/** Block prefix from a room label ("K18A-101 (Bed A)" → "K18A"). */
function blockOf(roomLabel: string | null): string {
  const m = (roomLabel ?? "").match(/^([A-Za-z0-9]+)\s*-/)
  return m ? m[1].toUpperCase() : "Unassigned"
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const soft: Record<PillTone, string> = {
    info: color.info.soft,
    warning: color.warning.soft,
    success: color.success.soft,
    danger: color.danger.soft,
    neutral: color.canvasSunk,
  }
  const ink: Record<PillTone, string> = {
    info: color.info.ink,
    warning: color.warning.ink,
    success: color.success.ink,
    danger: color.danger.ink,
    neutral: color.ink[700],
  }
  const main: Record<PillTone, string> = {
    info: color.info.main,
    warning: color.warning.main,
    success: color.success.main,
    danger: color.danger.main,
    neutral: color.ink[300],
  }
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.625,
        px: 1,
        py: 0.375,
        borderRadius: 999,
        backgroundColor: soft[tone],
        color: ink[tone],
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Box sx={{ width: 6, height: 6, borderRadius: 999, backgroundColor: main[tone] }} />
      {children}
    </Box>
  )
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

interface PrintLogos {
  ukmLogoUrl: string | null
  appLogoUrl: string | null
}

const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; }
  .muted { color: #64748B; font-size: 12px; }

  /* ── Document header (shared) ── */
  .doc-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-radius: 18px; border: 1px solid #C7E6CE; background: linear-gradient(120deg, #EAF7EE 0%, #F1FAF2 55%, #F7FBF3 100%); }
  .doc-header .logos { display: flex; align-items: center; gap: 16px; }
  .doc-header .logos img { height: 54px; width: auto; max-width: 150px; object-fit: contain; }
  .doc-header .brandtext { text-align: right; }
  .doc-header h1 { font-size: 19px; letter-spacing: -0.02em; color: #004B23; }
  .rule { height: 3px; width: 100%; background: linear-gradient(90deg, #004B23, #91C953); border-radius: 999px; margin: 12px 0 20px; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 800; letter-spacing: 0.10em; }
  .badge.check_in { background: linear-gradient(135deg, #0B6B33, #004B23); color: #fff; }
  .badge.check_out { background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; }

  /* ── Records report ── */
  table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
  th, td { border: 1px solid #E2E8F0; padding: 6px 8px; text-align: left; vertical-align: middle; }
  th { background: #F1F5F9; }
  .sig img { height: 34px; object-fit: contain; }

  /* ── Poster ── */
  .poster { text-align: center; }
  .poster .poster-title { font-size: 38px; letter-spacing: -0.035em; line-height: 1.05; margin: 14px 0 8px; color: #0F172A; }
  .poster .session { display: inline-block; font-size: 14px; font-weight: 700; color: #0B6B33; background: #EAF7EE; border: 1px solid #C7E6CE; border-radius: 999px; padding: 5px 14px; }
  .poster .qr-wrap { margin: 20px auto 4px; width: 110mm; padding: 8mm; border-radius: 24px; background: #fff; border: 2px solid #A9D9B5; box-shadow: 0 0 0 7px #EAF7EE; }
  .poster .qr-wrap img { display: block; width: 100%; height: auto; }
  .poster .scan-hint { font-size: 15px; color: #475569; font-weight: 600; margin: 20px 0 22px; }
  .poster .steps { text-align: left; max-width: 162mm; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 18px; padding: 20px 24px; background: linear-gradient(180deg, #F8FAFC, #FFFFFF); }
  .poster .steps h3 { font-size: 15px; color: #004B23; margin-bottom: 12px; }
  .poster .steps ol { list-style: none; counter-reset: step; padding: 0; }
  .poster .steps li { position: relative; padding-left: 36px; margin: 11px 0; font-size: 14px; color: #334155; }
  .poster .steps li::before { counter-increment: step; content: counter(step); position: absolute; left: 0; top: -2px; width: 24px; height: 24px; border-radius: 999px; background: linear-gradient(135deg, #0B6B33, #004B23); color: #fff; font-size: 12px; font-weight: 800; line-height: 24px; text-align: center; }
  .poster .steps li b { color: #0F172A; }
  .poster .zh { margin-top: 14px; font-size: 13px; color: #64748B; }
  .poster .footer { margin-top: 8px; color: #94A3B8; font-size: 12px; }
`

/** Build the shared A4 document header with the UKM + myKIZ logos. */
function docHeader(logos: PrintLogos, rightTitle: string, rightSub: string): string {
  const logoImgs = [
    logos.ukmLogoUrl ? `<img src="${escHtml(logos.ukmLogoUrl)}" alt="UKM" />` : "",
    logos.appLogoUrl ? `<img src="${escHtml(logos.appLogoUrl)}" alt="myKIZ" />` : "",
  ].join("")
  return `<div class="doc-header">
    <div class="logos">${logoImgs || '<span class="muted">KOLEJ IBU ZAIN</span>'}</div>
    <div class="brandtext"><h1>${escHtml(rightTitle)}</h1><div class="muted">${escHtml(rightSub)}</div></div>
  </div>
  <div class="rule"></div>`
}

/**
 * Print an HTML fragment at A4 using a hidden same-origin iframe. More reliable
 * than window.open (no popup blocker) and waits for images before printing.
 */
function printHtml(title: string, body: string) {
  const prev = document.getElementById("__kiz_print_frame")
  if (prev) prev.remove()

  const iframe = document.createElement("iframe")
  iframe.id = "__kiz_print_frame"
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.position = "fixed"
  iframe.style.left = "-9999px"
  iframe.style.top = "0"
  iframe.style.width = "1px"
  iframe.style.height = "1px"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    iframe.remove()
    return
  }

  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${body}</body></html>`)
  doc.close()

  const win = iframe.contentWindow
  const trigger = () => {
    try {
      win?.focus()
      win?.print()
    } finally {
      setTimeout(() => iframe.remove(), 1500)
    }
  }

  const images = Array.from(doc.images)
  if (images.length === 0) {
    setTimeout(trigger, 200)
    return
  }
  let remaining = images.length
  const oneDone = () => {
    remaining -= 1
    if (remaining <= 0) trigger()
  }
  images.forEach((img) => {
    if (img.complete) oneDone()
    else {
      img.onload = oneDone
      img.onerror = oneDone
    }
  })
  // Safety net in case an image never fires.
  setTimeout(() => {
    if (document.getElementById("__kiz_print_frame")) trigger()
  }, 2500)
}

function buildPosterHtml(s: SessionRow, logos: PrintLogos) {
  const isIn = s.type === "check_in"
  const action = isIn ? "CHECK-IN" : "CHECK-OUT"
  return `
  ${docHeader(logos, "KOLEJ IBU ZAIN", "Universiti Kebangsaan Malaysia")}
  <div class="poster">
    <span class="badge ${s.type}">${action}</span>
    <h2 class="poster-title">Scan to check ${isIn ? "in" : "out"}</h2>
    <div class="session">${escHtml(s.name)}</div>
    <div class="qr-wrap"><img src="${s.qrDataUrl}" alt="Check-in QR code" /></div>
    <div class="scan-hint">Open your phone camera and point it at the QR code</div>
    <div class="steps">
      <h3>How to check ${isIn ? "in" : "out"}</h3>
      <ol>
        <li>Scan the QR code with your phone camera.</li>
        <li>Enter your <b>Matric No.</b></li>
        <li>Confirm your name and <b>sign</b> on your phone.</li>
        <li>Your <b>block &amp; room number</b> will appear — note it down.</li>
        ${isIn ? "<li>Collect your room key at the <b>UKM Real Estate</b> counter.</li>" : "<li>Return your room key at the <b>UKM Real Estate</b> counter.</li>"}
      </ol>
    </div>
    <p class="zh">${isIn ? "请前往 2 号柜台（UKM Real Estate）领取房间钥匙。" : "请前往 2 号柜台（UKM Real Estate）交还房间钥匙。"}</p>
    <p class="footer">Need help? Ask the staff at the KIZ counter.</p>
  </div>`
}

export function CheckinAdminClient({
  readOnly,
  sessions,
  records,
  logos,
  directionsImageUrl,
}: {
  readOnly: boolean
  sessions: SessionRow[]
  records: RecordRow[]
  logos: PrintLogos
  directionsImageUrl: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState(readOnly ? 1 : 0)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)
  const notify = (msg: string, sev: "success" | "error" = "success") => setToast({ msg, sev })

  // Sessions state
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<TypeVal>("check_in")
  const [newOpensAt, setNewOpensAt] = useState("")
  const [newClosesAt, setNewClosesAt] = useState("")
  const [creating, setCreating] = useState(false)

  // Edit-session dialog
  const [editing, setEditing] = useState<SessionRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editOpensAt, setEditOpensAt] = useState("")
  const [editClosesAt, setEditClosesAt] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete-session confirm
  const [deleting, setDeleting] = useState<SessionRow | null>(null)
  const [removing, setRemoving] = useState(false)

  // Manual check-in dialog
  const [manualOpen, setManualOpen] = useState(false)
  const [manualMatric, setManualMatric] = useState("")
  const [manualSessionId, setManualSessionId] = useState("")
  const [manualLookup, setManualLookup] = useState<{ name: string; roomLabel: string | null } | null>(null)
  const [manualLooking, setManualLooking] = useState(false)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualError, setManualError] = useState("")

  // Directions image upload
  const [uploadingDirections, setUploadingDirections] = useState(false)

  // Records filters
  const [sessionFilter, setSessionFilter] = useState<string>("all")
  const [blockFilter, setBlockFilter] = useState<string>("all")
  const [q, setQ] = useState("")
  const [detail, setDetail] = useState<ConsolidatedRow | null>(null)

  async function onCreate() {
    setCreating(true)
    const res = await createCheckInSession({
      name: newName,
      type: newType,
      opensAt: newOpensAt || null,
      closesAt: newClosesAt || null,
    })
    setCreating(false)
    if (res.ok) {
      notify(`Session created — print the QR sheet and paste it at the counter.`)
      setNewName("")
      setNewOpensAt("")
      setNewClosesAt("")
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't create the session", "error")
    }
  }

  function openEdit(s: SessionRow) {
    setEditing(s)
    setEditName(s.name)
    setEditOpensAt(toLocalInput(s.opensAt))
    setEditClosesAt(toLocalInput(s.closesAt))
  }

  async function onSaveEdit() {
    if (!editing) return
    setSavingEdit(true)
    const res = await updateCheckInSession({
      id: editing.id,
      name: editName,
      opensAt: editOpensAt || null,
      closesAt: editClosesAt || null,
    })
    setSavingEdit(false)
    if (res.ok) {
      notify("Session updated.")
      setEditing(null)
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't update the session", "error")
    }
  }

  async function onUploadDirections(file: File) {
    setUploadingDirections(true)
    const fd = new FormData()
    fd.append("image", file)
    const res = await uploadCheckinDirectionsImage(fd)
    setUploadingDirections(false)
    if (res.ok) {
      notify("Directions image updated.")
      router.refresh()
    } else {
      notify(res.error ?? "Upload failed", "error")
    }
  }

  async function onRemoveDirections() {
    const res = await removeCheckinDirectionsImage()
    if (res.ok) {
      notify("Directions image removed.")
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't remove the image", "error")
    }
  }

  async function onToggle(s: SessionRow) {
    const res = await setCheckInSessionActive(s.id, !s.isActive)
    if (res.ok) {
      notify(s.isActive ? `${s.name} is now inactive.` : `${s.name} is now active — QR scans will work.`)
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't update the session", "error")
    }
  }

  async function onDeleteSession() {
    if (!deleting) return
    setRemoving(true)
    const res = await deleteCheckInSession(deleting.id)
    setRemoving(false)
    if (res.ok) {
      notify(`Deleted "${deleting.name}". Any records it captured are kept.`)
      setDeleting(null)
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't delete the session", "error")
    }
  }

  function openManual() {
    setManualMatric("")
    setManualLookup(null)
    setManualError("")
    // Default to the active session of the current tab's type, else the newest.
    const preferred = sessions.find((s) => sessionStatus(s).label === "Open now") ?? sessions[0]
    setManualSessionId(preferred?.id ?? "")
    setManualOpen(true)
  }

  async function onLookupManual() {
    setManualError("")
    setManualLookup(null)
    setManualLooking(true)
    const res = await adminLookupStudent(manualMatric)
    setManualLooking(false)
    if (res.ok && res.name) {
      setManualLookup({ name: res.name, roomLabel: res.roomLabel ?? null })
    } else {
      setManualError(res.error ?? "Student not found.")
    }
  }

  async function onManualSubmit() {
    setManualError("")
    if (!manualSessionId) {
      setManualError("Pick a session first.")
      return
    }
    setManualSaving(true)
    const res = await adminManualCheckIn({ matricId: manualMatric, sessionId: manualSessionId })
    setManualSaving(false)
    if (res.ok) {
      const t = res.type === "check_out" ? "Check-out" : "Check-in"
      notify(`${t} recorded for ${manualLookup?.name ?? manualMatric}.`)
      setManualOpen(false)
      router.refresh()
    } else {
      setManualError(res.error ?? "Could not record the check-in.")
    }
  }

  const students = useMemo(() => consolidate(records), [records])

  const recordCheckInCount = records.filter((r) => r.type === "check_in").length
  const recordCheckOutCount = records.filter((r) => r.type === "check_out").length

  const blocks = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s) => set.add(blockOf(s.roomLabel)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [students])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return students.filter((s) => {
      if (sessionFilter !== "all" && !s.sessionIds.includes(sessionFilter)) return false
      if (blockFilter !== "all" && blockOf(s.roomLabel) !== blockFilter) return false
      if (needle) {
        const hay = `${s.matricId} ${s.name} ${s.roomLabel ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [students, sessionFilter, blockFilter, q])

  const checkedInCount = filtered.filter((s) => s.checkInAt).length
  const checkedOutCount = filtered.filter((s) => s.checkOutAt).length

  const statusOf = (s: ConsolidatedRow) => (s.checkOutAt ? "Checked out" : "Checked in")
  const EXPORT_HEADERS = ["No.", "Matric No.", "Name", "Block / Room", "Check-in (KL)", "Check-out (KL)", "Status"]
  const toRows = (list: ConsolidatedRow[]) =>
    list.map((s, i) => [
      i + 1,
      s.matricId,
      s.name,
      s.roomLabel ?? "",
      s.checkInAt ? formatMalaysia(new Date(s.checkInAt)) : "",
      s.checkOutAt ? formatMalaysia(new Date(s.checkOutAt)) : "",
      statusOf(s),
    ])

  function onExportExcel() {
    // One sheet per block (plus a summary + "All students") so the office can
    // file each block separately without touching a spreadsheet library.
    const byBlock = new Map<string, ConsolidatedRow[]>()
    for (const s of filtered) {
      const b = blockOf(s.roomLabel)
      const list = byBlock.get(b) ?? []
      list.push(s)
      byBlock.set(b, list)
    }
    const sortedBlocks = [...byBlock.keys()].sort((a, b) => a.localeCompare(b))

    const summaryRows = sortedBlocks.map((b) => {
      const list = byBlock.get(b)!
      return [b, list.length, list.filter((s) => s.checkInAt).length, list.filter((s) => s.checkOutAt).length]
    })
    summaryRows.push(["Total", filtered.length, checkedInCount, checkedOutCount])

    const sheets = [
      { name: "Summary", headers: ["Block", "Students", "Checked in", "Checked out"], rows: summaryRows },
      { name: "All students", headers: EXPORT_HEADERS, rows: toRows(filtered) },
      ...sortedBlocks.map((b) => ({ name: b, headers: EXPORT_HEADERS, rows: toRows(byBlock.get(b)!) })),
    ]

    downloadBlob(buildXlsx(sheets), `check-in-records-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  function onExportCsv() {
    const rows = filtered.map((s) => ({
      "Matric No.": s.matricId,
      Name: s.name,
      "Block / Room": s.roomLabel ?? "",
      "Check-in (KL)": s.checkInAt ? formatMalaysia(new Date(s.checkInAt)) : "",
      "Check-out (KL)": s.checkOutAt ? formatMalaysia(new Date(s.checkOutAt)) : "",
      Status: statusOf(s),
    }))
    const csv = toCsv(["Matric No.", "Name", "Block / Room", "Check-in (KL)", "Check-out (KL)", "Status"], rows)
    downloadBlob(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
      `check-in-records-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  function onPrintRecords() {
    const sigCell = (urls: (string | null)[]) => {
      const imgs = urls.filter(Boolean) as string[]
      if (imgs.length === 0) return "—"
      return imgs.map((u) => `<img src="${escHtml(u)}" alt="signature" />`).join("")
    }
    const rowsHtml = filtered
      .map(
        (s, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escHtml(s.matricId)}</td>
          <td>${escHtml(s.name)}</td>
          <td>${escHtml(s.roomLabel ?? "—")}</td>
          <td>${s.checkInAt ? formatMalaysia(new Date(s.checkInAt)) : "—"}</td>
          <td>${s.checkOutAt ? formatMalaysia(new Date(s.checkOutAt)) : "—"}</td>
          <td class="sig">${sigCell([s.checkInSignatureUrl, s.checkOutSignatureUrl])}</td>
        </tr>`,
      )
      .join("")
    const sub = `Fail Pentadbiran${sessionFilter !== "all" ? ` · ${sessions.find((s) => s.id === sessionFilter)?.name ?? ""}` : ""}${blockFilter !== "all" ? ` · ${blockFilter}` : ""}`
    printHtml(
      "Check-in / Check-out Records",
      `${docHeader(logos, "Check-in / Check-out Records", sub)}
       <div class="muted">Generated ${formatMalaysia(new Date())} · Malaysia time (UTC+8) · ${filtered.length} student(s)</div>
       <table><thead><tr><th>#</th><th>Matric</th><th>Name</th><th>Block / Room</th><th>Check-in (KL)</th><th>Check-out (KL)</th><th>Signature</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="7">No records.</td></tr>`}</tbody></table>`,
    )
  }

  const columns: GridColDef[] = [
    { field: "matricId", headerName: "Matric", width: 120 },
    { field: "name", headerName: "Name", width: 210 },
    { field: "roomLabel", headerName: "Block / Room", width: 160, valueFormatter: (v) => v ?? "—" },
    {
      field: "checkInAt",
      headerName: "Check-in (KL)",
      width: 185,
      renderCell: (p) => <span>{p.row.checkInAt ? formatMalaysia(new Date(p.row.checkInAt)) : "—"}</span>,
    },
    {
      field: "checkOutAt",
      headerName: "Check-out (KL)",
      width: 185,
      renderCell: (p) => <span>{p.row.checkOutAt ? formatMalaysia(new Date(p.row.checkOutAt)) : "—"}</span>,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      valueGetter: (_value, row) => (row.checkOutAt ? "Checked out" : "Checked in"),
      renderCell: (p) =>
        p.row.checkOutAt ? (
          <Pill tone="neutral">Checked out</Pill>
        ) : (
          <Pill tone="success">Checked in</Pill>
        ),
    },
    {
      field: "signature",
      headerName: "Signature",
      width: 110,
      renderCell: (p) => <Button size="small" onClick={() => setDetail(p.row)}>View</Button>,
    },
  ]

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          minHeight: 40,
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontWeight: 600 },
        }}
      >
        {!readOnly && <Tab label="Sessions" value={0} icon={<KIcon icon="qr_code_2" size={18} />} iconPosition="start" />}
        <Tab label="Records" value={1} icon={<KIcon icon="fact_check" size={18} />} iconPosition="start" />
      </Tabs>

      {tab === 0 && !readOnly && (
        <Box>
          <Bento sx={{ mb: 2 }}>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Active sessions" value={sessions.filter((s) => s.isActive).length} icon="qr_code_2" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Check-in records" value={recordCheckInCount} icon="login" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Check-out records" value={recordCheckOutCount} icon="logout" />
            </BentoItem>
          </Bento>

          <FormSection title="New session" subtitle="One QR per period — set the session and year, and the dates it is open. Open check-in at move-in, switch to check-out at move-out." icon="add_circle">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Session / year"
                placeholder="e.g. Move-in Long Sem 1 · 2026/2027"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                fullWidth
              />
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.75, display: "block" }}>
                  Session type
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  {(["check_in", "check_out"] as TypeVal[]).map((t) => (
                    <Button
                      key={t}
                      variant={newType === t ? "contained" : "outlined"}
                      onClick={() => setNewType(t)}
                      startIcon={<KIcon icon={t === "check_in" ? "login" : "logout"} size={16} />}
                    >
                      {typeLabel(t)}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Opens"
                  type="datetime-local"
                  value={newOpensAt}
                  onChange={(e) => setNewOpensAt(e.target.value)}
                  helperText="Optional — scans are rejected before this."
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="Closes"
                  type="datetime-local"
                  value={newClosesAt}
                  onChange={(e) => setNewClosesAt(e.target.value)}
                  helperText="Optional — scans are rejected after this."
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Box>
                <KButton icon="qr_code" loading={creating} disabled={!newName.trim()} onClick={onCreate}>
                  Create session &amp; get QR
                </KButton>
              </Box>
            </Box>
          </FormSection>

          <FormSection title="Sessions" subtitle="Print a session's QR sheet and paste it at the counter. Only the active session accepts scans." icon="sensors">
            {sessions.length === 0 ? (
              <KEmpty compact icon="qr_code_2" title="No sessions yet" body="Create your first check-in session above." />
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {sessions.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: `${radius.card}px`,
                      backgroundColor: "background.paper",
                      alignItems: { xs: "flex-start", sm: "center" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flex: 1 }}>
                      <Pill tone={TYPE_META[s.type].tone}>{typeLabel(s.type)}</Pill>
                      <Pill tone={sessionStatus(s).tone}>{sessionStatus(s).label}</Pill>
                      <Box sx={{ width: "100%" }}>
                        <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{s.name}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {sessionWindowLabel(s)} · {s.recordCount} record{s.recordCount === 1 ? "" : "s"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.disabled", display: "block", overflowWrap: "anywhere" }}>
                          {s.url}
                        </Typography>
                      </Box>
                    </Box>

                    <Box component="img" src={s.qrDataUrl} alt={`QR for ${s.name}`} sx={{ width: 92, height: 92, borderRadius: 2, border: "1px solid", borderColor: "divider" }} />

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: { xs: "100%", sm: 200 } }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => printHtml(`${typeLabel(s.type)} — ${s.name}`, buildPosterHtml(s, logos))}
                        startIcon={<KIcon icon="print" size={16} />}
                      >
                        Print QR sheet
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => openEdit(s)}
                        startIcon={<KIcon icon="edit_calendar" size={16} />}
                      >
                        Edit period
                      </Button>
                      <Button
                        variant="outlined"
                        color={s.isActive ? "error" : "inherit"}
                        fullWidth
                        onClick={() => onToggle(s)}
                        startIcon={<KIcon icon={s.isActive ? "pause" : "play_arrow"} size={16} />}
                      >
                        {s.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="text"
                        color="error"
                        fullWidth
                        onClick={() => setDeleting(s)}
                        startIcon={<KIcon icon="delete" size={16} />}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </FormSection>

          <FormSection title="Counter 2 directions" subtitle="Shown to students right after they check in — e.g. a map or photo pointing to the UKM Real Estate counter." icon="directions">
            {directionsImageUrl ? (
              <Box>
                <Box
                  component="img"
                  src={directionsImageUrl}
                  alt="Directions to Counter 2 — UKM Real Estate"
                  sx={{ display: "block", width: "100%", maxWidth: 420, borderRadius: `${radius.card}px`, border: "1px solid", borderColor: "divider" }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                  <Button component="label" variant="outlined" disabled={uploadingDirections} startIcon={<KIcon icon="swap_horiz" size={16} />}>
                    Replace image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && onUploadDirections(e.target.files[0])}
                    />
                  </Button>
                  <Button variant="outlined" color="error" onClick={onRemoveDirections} startIcon={<KIcon icon="delete" size={16} />}>
                    Remove
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Button component="label" variant="contained" disabled={uploadingDirections} startIcon={uploadingDirections ? <CircularProgress size={15} color="inherit" /> : <KIcon icon="upload" size={16} />}>
                  {uploadingDirections ? "Uploading…" : "Upload directions image"}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && onUploadDirections(e.target.files[0])}
                  />
                </Button>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
                  Not set — students will only see the text instruction.
                </Typography>
              </Box>
            )}
          </FormSection>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Bento sx={{ mb: 2 }}>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Students" value={filtered.length} icon="group" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Checked in" value={checkedInCount} icon="login" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Checked out" value={checkedOutCount} icon="logout" />
            </BentoItem>
          </Bento>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2, alignItems: "center" }}>
            <TextField
              select
              label="Block"
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="all">All blocks</MenuItem>
              {blocks.map((b) => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Session"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="all">All sessions</MenuItem>
              {sessions.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search matric / name / room…"
              size="small"
              sx={{ flex: 1, minWidth: 200 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <KIcon icon="search" size={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained" color="success" onClick={openManual} startIcon={<KIcon icon="how_to_reg" size={16} />}>
                Manual check-in
              </Button>
              <Button variant="contained" onClick={onExportExcel} startIcon={<KIcon icon="table_view" size={16} />}>
                Excel (.xlsx)
              </Button>
              <Button variant="outlined" onClick={onExportCsv} startIcon={<KIcon icon="download" size={16} />}>
                CSV
              </Button>
              <Button variant="outlined" onClick={onPrintRecords} startIcon={<KIcon icon="print" size={16} />}>
                Print
              </Button>
            </Box>
          </Box>

          <SmartTable
            rows={filtered}
            columns={columns}
            getRowId={(r) => r.id}
            emptyIcon="receipt_long"
            emptyTitle="No students here yet"
            emptyBody={records.length === 0 ? "Records appear when students scan the session QR at the counter." : "No students match these filters."}
            onRowClick={(r) => setDetail(r)}
          />
        </Box>
      )}

      {/* Student detail — check-in & check-out signatures */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        {detail && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.brand[50],
                  color: color.brand[700],
                }}
              >
                <KIcon icon="badge" size={20} />
              </span>
              {detail.name}
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, fontSize: 14 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Matric</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{detail.matricId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Room</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{detail.roomLabel ?? "—"}</Typography>
                </Box>
              </Box>

              {([
                { label: "Check-in", at: detail.checkInAt, session: detail.checkInSession, sig: detail.checkInSignatureUrl, manual: detail.checkInManual },
                { label: "Check-out", at: detail.checkOutAt, session: detail.checkOutSession, sig: detail.checkOutSignatureUrl, manual: detail.checkOutManual },
              ] as const).map((block) => (
                <Box key={block.label}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{block.label}</Typography>
                    {block.at ? (
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {formatMalaysia(new Date(block.at))}
                        {block.session ? ` · ${block.session}` : ""}
                      </Typography>
                    ) : (
                      <Pill tone="neutral">Not yet</Pill>
                    )}
                    {block.manual && <Pill tone="info">Manual</Pill>}
                  </Box>
                  {block.sig ? (
                    <Box
                      component="img"
                      src={block.sig}
                      alt={`${block.label} signature of ${detail.name}`}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: `${radius.input}px`,
                        backgroundColor: "#fff",
                        p: 1.5,
                        maxWidth: "100%",
                      }}
                    />
                  ) : (
                    <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                      {block.manual
                        ? "Recorded manually by an admin (no signature)."
                        : block.at
                          ? "No signature was captured."
                          : `No ${block.label.toLowerCase()} yet.`}
                    </Alert>
                  )}
                </Box>
              ))}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Edit session period */}
      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        {editing && (
          <>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.brand[50],
                  color: color.brand[700],
                }}
              >
                <KIcon icon="edit_calendar" size={20} />
              </span>
              Edit session
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
              <TextField
                label="Session / year"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
              />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="Opens"
                  type="datetime-local"
                  value={editOpensAt}
                  onChange={(e) => setEditOpensAt(e.target.value)}
                  helperText="Optional"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="Closes"
                  type="datetime-local"
                  value={editClosesAt}
                  onChange={(e) => setEditClosesAt(e.target.value)}
                  helperText="Optional"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Alert severity="info" variant="standard" sx={{ borderRadius: 2 }}>
                The QR code link stays the same — only the name and dates change.
              </Alert>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
              <KButton icon="save" loading={savingEdit} disabled={!editName.trim()} onClick={onSaveEdit}>
                Save changes
              </KButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete session confirm */}
      <Dialog open={Boolean(deleting)} onClose={() => setDeleting(null)} maxWidth="xs" fullWidth>
        {deleting && (
          <>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                <b>{deleting.name}</b> will be removed and its QR code will stop
                working. Any records it already captured are kept in the admin file.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button variant="outlined" onClick={() => setDeleting(null)}>Cancel</Button>
              <KButton icon="delete" loading={removing} onClick={onDeleteSession}>
                Delete session
              </KButton>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Manual check-in */}
      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <span
            style={{
              display: "inline-flex",
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.success.soft,
              color: color.success.ink,
            }}
          >
            <KIcon icon="how_to_reg" size={20} />
          </span>
          Manual check-in
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <Alert severity="info" variant="standard" sx={{ borderRadius: 2 }}>
            Use this when a student can&apos;t scan (or to test). No signature is
            captured — it&apos;s recorded under your name.
          </Alert>

          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="Matric No."
              placeholder="A123456"
              value={manualMatric}
              onChange={(e) => {
                setManualMatric(e.target.value.toUpperCase())
                setManualLookup(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && onLookupManual()}
              fullWidth
              slotProps={{ htmlInput: { sx: { textTransform: "uppercase" } } }}
            />
            <Button
              variant="outlined"
              onClick={onLookupManual}
              disabled={manualLooking || !manualMatric.trim()}
              sx={{ height: 56, whiteSpace: "nowrap" }}
              startIcon={manualLooking ? <CircularProgress size={15} /> : <KIcon icon="search" size={16} />}
            >
              Look up
            </Button>
          </Box>

          {manualLookup && (
            <Alert severity="success" variant="outlined" sx={{ borderRadius: 2 }}>
              <b>{manualLookup.name}</b> · {manualLookup.roomLabel ?? "No room assigned"}
            </Alert>
          )}

          <TextField
            select
            label="Session"
            value={manualSessionId}
            onChange={(e) => setManualSessionId(e.target.value)}
            fullWidth
            helperText="The record's type follows the session."
          >
            {sessions.length === 0 && <MenuItem value="" disabled>No sessions — create one first</MenuItem>}
            {sessions.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {typeLabel(s.type)} · {s.name}
              </MenuItem>
            ))}
          </TextField>

          {manualError && (
            <Alert severity="error" variant="standard" sx={{ borderRadius: 2 }}>
              {manualError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button variant="outlined" onClick={() => setManualOpen(false)}>Cancel</Button>
          <KButton
            icon="how_to_reg"
            loading={manualSaving}
            disabled={!manualLookup || !manualSessionId}
            onClick={onManualSubmit}
          >
            Record {sessions.find((s) => s.id === manualSessionId)?.type === "check_out" ? "check-out" : "check-in"}
          </KButton>
        </DialogActions>
      </Dialog>

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

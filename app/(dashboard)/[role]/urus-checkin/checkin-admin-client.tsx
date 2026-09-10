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
import InputAdornment from "@mui/material/InputAdornment"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { SmartTable } from "@/components/kiz/patterns/smart-table"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { color, radius } from "@/lib/theme"
import { formatMalaysia } from "@/lib/timezone"
import { toCsv } from "@/lib/csv"
import { createCheckInSession, setCheckInSessionActive } from "@/lib/checkin"
import type { GridColDef } from "@mui/x-data-grid"

type TypeVal = "check_in" | "check_out"
type PillTone = "info" | "warning" | "success" | "neutral"

interface SessionRow {
  id: string
  name: string
  type: TypeVal
  token: string
  isActive: boolean
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
  signedAt: string
}

const TYPE_META: Record<TypeVal, { label: string; tone: PillTone }> = {
  check_in: { label: "Check-in", tone: "info" },
  check_out: { label: "Check-out", tone: "warning" },
}

function typeLabel(t: TypeVal) {
  return TYPE_META[t].label
}

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const soft: Record<PillTone, string> = {
    info: color.info.soft,
    warning: color.warning.soft,
    success: color.success.soft,
    neutral: color.canvasSunk,
  }
  const ink: Record<PillTone, string> = {
    info: color.info.ink,
    warning: color.warning.ink,
    success: color.success.ink,
    neutral: color.ink[700],
  }
  const main: Record<PillTone, string> = {
    info: color.info.main,
    warning: color.warning.main,
    success: color.success.main,
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

/** Open a print-ready report in a new window and print it. */
function printHtml(title: string, body: string) {
  const w = window.open("", "_blank", "width=900,height=1200")
  if (!w) return
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 32px; }
    h1 { font-size: 22px; letter-spacing: -0.02em; }
    h2 { font-size: 15px; font-weight: 600; margin: 18px 0 4px; }
    .muted { color: #71717a; font-size: 12px; }
    .brand { display:flex; align-items:center; gap:10px; margin-bottom: 20px; }
    .brand .logo { width: 30px; height: 30px; border-radius: 8px; background: #164E63; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; }
    th { background: #f4f4f5; }
    .badge { display:inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .badge.check_in { background:#e0f2fe; color:#075985; }
    .badge.check_out { background:#fef3c7; color:#92400e; }
    .qr { margin: 16px 0; }
    .steps { margin-top: 8px; padding-left: 18px; }
    .steps li { margin: 4px 0; font-size: 14px; }
    .sig img { height: 34px; object-fit: contain; }
    @media print { body { padding: 12px; } }
  </style></head><body>${body}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 350)
}

function buildPosterHtml(s: SessionRow) {
  return `
  <div class="brand"><span class="logo">K</span><div><h1>KOLEJ IBU ZAIN — ${escHtml(typeLabel(s.type))}</h1>
  <div class="muted">Kolej Ibu Zain · Universiti Kebangsaan Malaysia · ${escHtml(s.name)}</div></div></div>
  <p>Students — scan this QR code with your phone camera to check ${s.type === "check_in" ? "in" : "out"}.</p>
  <div class="qr"><img src="${s.qrDataUrl}" width="230" height="230" alt="QR code" /></div>
  <h2>How it works</h2>
  <ol class="steps">
    <li>Open your phone camera and scan the QR code above.</li>
    <li>Enter your <b>Matric No.</b>.</li>
    <li>Confirm your name and <b>sign</b> on your phone.</li>
    <li>Your <b>block &amp; room number</b> will appear — note it down.</li>
    ${s.type === "check_in" ? '<li>Collect your room key at the <b>UKM Real Estate</b> counter.</li>' : "<li>Return your key at the <b>UKM Real Estate</b> counter.</li>"}
  </ol>
  <p class="muted" style="margin-top:18px">Need help? Ask the staff at the KIZ counter.</p>`
}

export function CheckinAdminClient({
  readOnly,
  sessions,
  records,
}: {
  readOnly: boolean
  sessions: SessionRow[]
  records: RecordRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState(readOnly ? 1 : 0)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)
  const notify = (msg: string, sev: "success" | "error" = "success") => setToast({ msg, sev })

  // Sessions state
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<TypeVal>("check_in")
  const [creating, setCreating] = useState(false)

  // Records filters
  const [typeFilter, setTypeFilter] = useState<"all" | TypeVal>("all")
  const [sessionFilter, setSessionFilter] = useState<string>("all")
  const [q, setQ] = useState("")
  const [detail, setDetail] = useState<RecordRow | null>(null)

  async function onCreate() {
    setCreating(true)
    const res = await createCheckInSession({ name: newName, type: newType })
    setCreating(false)
    if (res.ok) {
      notify(`Session created — print the QR sheet and paste it at the counter.`)
      setNewName("")
      router.refresh()
    } else {
      notify(res.error ?? "Couldn't create the session", "error")
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return records.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false
      if (sessionFilter !== "all" && r.sessionId !== sessionFilter) return false
      if (needle) {
        const hay = `${r.matricId} ${r.name} ${r.roomLabel ?? ""}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [records, typeFilter, sessionFilter, q])

  const checkInCount = records.filter((r) => r.type === "check_in").length
  const checkOutCount = records.filter((r) => r.type === "check_out").length

  function onExport() {
    const rows = filtered.map((r) => ({
      "Matric No.": r.matricId,
      Name: r.name,
      Type: typeLabel(r.type),
      "Block / Room": r.roomLabel ?? "",
      Session: r.sessionName,
      "Signed at (KL)": formatMalaysia(new Date(r.signedAt)),
    }))
    const csv = toCsv(["Matric No.", "Name", "Type", "Block / Room", "Session", "Signed at (KL)"], rows)
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `check-in-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onPrintRecords() {
    const rowsHtml = filtered
      .map(
        (r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escHtml(r.matricId)}</td>
          <td>${escHtml(r.name)}</td>
          <td><span class="badge ${r.type}">${typeLabel(r.type)}</span></td>
          <td>${escHtml(r.roomLabel ?? "—")}</td>
          <td>${formatMalaysia(new Date(r.signedAt))}</td>
          <td class="sig">${r.signatureUrl ? `<img src="${escHtml(r.signatureUrl)}" alt="signature" />` : "—"}</td>
        </tr>`,
      )
      .join("")
    const typeLabelFilter = typeFilter === "all" ? "All records" : typeLabel(typeFilter)
    printHtml(
      "Check-in Records",
      `<h1>KOLEJ IBU ZAIN — Check-in / Check-out Records</h1>
       <div class="muted">Fail Pentadbiran · ${typeLabelFilter}${sessionFilter !== "all" ? ` · ${escHtml(sessions.find((s) => s.id === sessionFilter)?.name ?? "")}` : ""}</div>
       <div class="muted">Generated ${formatMalaysia(new Date())} · Malaysia time (UTC+8)</div>
       <table><thead><tr><th>#</th><th>Matric</th><th>Name</th><th>Type</th><th>Block / Room</th><th>Signed at (KL)</th><th>Signature</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="7">No records.</td></tr>`}</tbody></table>`,
    )
  }

  const columns: GridColDef[] = [
    { field: "matricId", headerName: "Matric", width: 120 },
    { field: "name", headerName: "Name", width: 220 },
    {
      field: "type",
      headerName: "Type",
      width: 110,
      renderCell: (p) => <Pill tone={TYPE_META[p.row.type as TypeVal].tone}>{typeLabel(p.row.type)}</Pill>,
    },
    { field: "roomLabel", headerName: "Block / Room", width: 170, valueFormatter: (v) => v ?? "—" },
    {
      field: "signedAt",
      headerName: "Signed at (KL)",
      width: 190,
      renderCell: (p) => <span>{formatMalaysia(new Date(p.row.signedAt))}</span>,
    },
    {
      field: "signature",
      headerName: "Signature",
      width: 120,
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
              <MetricTile label="Check-in records" value={checkInCount} icon="login" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Check-out records" value={checkOutCount} icon="logout" />
            </BentoItem>
          </Bento>

          <FormSection title="New session" subtitle="One QR per period — open check-in at move-in, switch to check-out at move-out." icon="add_circle">
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Session name"
                placeholder="e.g. Move-in Long Sem 1"
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
                      <Pill tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Pill>
                      <Box sx={{ width: "100%" }}>
                        <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{s.name}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", overflowWrap: "anywhere" }}>
                          {s.url} · {s.recordCount} record{s.recordCount === 1 ? "" : "s"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box component="img" src={s.qrDataUrl} alt={`QR for ${s.name}`} sx={{ width: 92, height: 92, borderRadius: 2, border: "1px solid", borderColor: "divider" }} />

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: { xs: "100%", sm: 200 } }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => printHtml(`${typeLabel(s.type)} — ${s.name}`, buildPosterHtml(s))}
                        startIcon={<KIcon icon="print" size={16} />}
                      >
                        Print QR sheet
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
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </FormSection>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Bento sx={{ mb: 2 }}>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Total records" value={filtered.length} icon="receipt_long" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Check-in" value={checkInCount} icon="login" />
            </BentoItem>
            <BentoItem span={4} spanXs={2}>
              <MetricTile label="Check-out" value={checkOutCount} icon="logout" />
            </BentoItem>
          </Bento>

          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2, alignItems: { sm: "center" } }}>
            <TextField
              select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | TypeVal)}
              size="small"
              sx={{ minWidth: 140 }}
              slotProps={{ select: { displayEmpty: true } }}
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="check_in">Check-in</MenuItem>
              <MenuItem value="check_out">Check-out</MenuItem>
            </TextField>
            <TextField
              select
              label="Session"
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
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
              sx={{ flex: 1 }}
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
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={onExport} startIcon={<KIcon icon="download" size={16} />}>
                Export CSV
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
            emptyTitle="No records here yet"
            emptyBody={records.length === 0 ? "Records appear when students scan the session QR at the counter." : "No records match these filters."}
            onRowClick={(r) => setDetail(r)}
          />
        </Box>
      )}

      {/* Record detail — signature preview */}
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
                <KIcon icon={detail.type === "check_in" ? "login" : "logout"} size={20} />
              </span>
              {detail.name}
            </DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, fontSize: 14 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Matric</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{detail.matricId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Room</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{detail.roomLabel ?? "—"}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Signed at</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{formatMalaysia(new Date(detail.signedAt))}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Session</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{detail.sessionName}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                  Digital signature
                </Typography>
                {detail.signatureUrl ? (
                  <Box
                    component="img"
                    src={detail.signatureUrl}
                    alt={`Signature of ${detail.name}`}
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
                    No signature was captured for this record.
                  </Alert>
                )}
              </Box>
            </DialogContent>
          </>
        )}
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

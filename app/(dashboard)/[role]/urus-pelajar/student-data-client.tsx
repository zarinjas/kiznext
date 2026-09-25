"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
import Snackbar from "@mui/material/Snackbar"
import InputAdornment from "@mui/material/InputAdornment"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { Surface } from "@/components/kiz/primitives/list-group"
import { Bento, BentoItem, MetricTile } from "@/components/kiz/patterns/bento"
import { color, radius } from "@/lib/theme"
import { formatMalaysia } from "@/lib/timezone"
import { toCsv } from "@/lib/csv"
import { buildXlsx, type XlsxSheet } from "@/lib/xlsx"
import { docHeader, printHtml, escHtml, type PrintLogos } from "@/lib/print-doc"
import { CohortChip, cohortLabel, type StudentCohort } from "@/components/shared/cohort-chip"
import type { StudentData, StudentRow, BreakdownRow } from "@/lib/student-data"
import { syncNow } from "./actions"

type FilterCohort = "all" | StudentCohort
type FilterStatus = "all" | "registered" | "not_registered" | "checked_in" | "not_checked_in" | "no_room"

const COHORT_CHIPS: { value: FilterCohort; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "postgrad", label: "Postgrad" },
  { value: "unknown", label: "Unknown" },
]

const CHECK_IN_LABEL: Record<StudentRow["checkInStatus"], string> = {
  checked_in: "Checked in",
  checked_out: "Checked out",
  not_checked_in: "Not checked in",
}

function checkInLabel(status: StudentRow["checkInStatus"]): string {
  return CHECK_IN_LABEL[status]
}

function isCheckedIn(status: StudentRow["checkInStatus"]): boolean {
  return status === "checked_in" || status === "checked_out"
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function StatusPill({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 0.75,
        py: 0.125,
        borderRadius: 1,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: ok ? color.success.soft : color.canvasSunk,
        color: ok ? color.success.ink : color.ink[500],
        whiteSpace: "nowrap",
      }}
    >
      {ok ? yes : no}
    </Box>
  )
}

function SectionCard({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Surface padded>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontWeight: 650 }}>{title}</Typography>
          {subtitle ? (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Box>
      {children}
    </Surface>
  )
}

const TABLE_SX = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: `${radius.card}px`,
  overflow: "auto",
  backgroundColor: "background.paper",
  "& th, & td": { borderBottom: "1px solid", borderColor: "divider", verticalAlign: "middle", fontSize: "0.8125rem" },
  "& th": {
    fontSize: "0.6875rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "text.secondary",
    backgroundColor: "action.hover",
  },
  "& tbody tr:hover": { backgroundColor: "rgba(9,9,11,0.035)" },
  "& tbody tr:last-child td": { borderBottom: "none" },
} as const

const STUDENT_HEADERS = [
  "Matric No.",
  "Name",
  "Cohort",
  "Gender",
  "Faculty",
  "Nationality",
  "Block",
  "Room",
  "Registered",
  "Check-in",
  "App account",
]

function studentRowToArray(r: StudentRow): (string | number)[] {
  return [
    r.matricId,
    r.name,
    cohortLabel(r.cohort),
    r.gender,
    r.faculty ?? "",
    r.nationality,
    r.block ?? "",
    r.room ?? "",
    r.isRegistered ? "Yes" : "No",
    checkInLabel(r.checkInStatus),
    r.hasAccount ? "Yes" : "No",
  ]
}

export function StudentDataClient({
  data,
  canSync,
  logos,
}: {
  data: StudentData
  canSync: boolean
  logos: PrintLogos
}) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [cohort, setCohort] = useState<FilterCohort>("all")
  const [block, setBlock] = useState<string>("all")
  const [status, setStatus] = useState<FilterStatus>("all")
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)

  const blockOptions = useMemo(
    () => [...new Set(data.students.map((s) => s.block ?? "Unassigned"))].sort((a, b) =>
      a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b),
    ),
    [data.students],
  )

  const filtered = useMemo(() => {
    return data.students.filter((s) => {
      if (cohort !== "all" && s.cohort !== cohort) return false
      if (block !== "all" && (s.block ?? "Unassigned") !== block) return false
      if (status === "registered" && !s.isRegistered) return false
      if (status === "not_registered" && s.isRegistered) return false
      if (status === "checked_in" && !isCheckedIn(s.checkInStatus)) return false
      if (status === "not_checked_in" && isCheckedIn(s.checkInStatus)) return false
      if (status === "no_room" && s.room) return false
      if (search) {
        const hay = `${s.matricId} ${s.name} ${s.faculty ?? ""} ${s.block ?? ""} ${s.room ?? ""}`.toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [data.students, cohort, block, status, search])

  const exportLabel = `student-data-${new Date().toISOString().slice(0, 10)}`

  function onSync() {
    setSyncing(true)
    syncNow()
      .then((res) => {
        if (res.ok) {
          setToast({ msg: `Synced — ${res.added ?? 0} added, ${res.moved ?? 0} moved, ${res.removed ?? 0} removed.`, sev: "success" })
          router.refresh()
        } else {
          setToast({ msg: res.error ?? "Sync failed.", sev: "error" })
        }
      })
      .catch((e) => setToast({ msg: e instanceof Error ? e.message : "Sync failed.", sev: "error" }))
      .finally(() => setSyncing(false))
  }

  function onExportExcel() {
    const summaryRows = data.cohorts.map((c) => [
      c.label,
      c.total,
      c.registered,
      c.notRegistered,
      c.checkedIn,
      c.notCheckedIn,
      c.withRoom,
      c.withoutRoom,
      c.withAccount,
    ])
    summaryRows.push([
      "Total",
      data.totals.total,
      data.totals.registered,
      data.totals.notRegistered,
      data.totals.checkedIn,
      data.totals.notCheckedIn,
      data.totals.withRoom,
      data.totals.withoutRoom,
      data.totals.withAccount,
    ])

    const breakdownSheet = (name: string, rows: BreakdownRow[]): XlsxSheet => ({
      name,
      headers: [name.replace("By ", "").replace(/^\w/, (m) => m.toUpperCase()), "Total", "Registered", "Checked in"],
      rows: rows.map((r) => [r.key, r.total, r.registered, r.checkedIn]),
    })

    const sheets: XlsxSheet[] = [
      {
        name: "Summary",
        headers: ["Cohort", "Total", "Registered", "Not registered", "Checked in", "Not checked in", "With room", "Without room", "With account"],
        rows: summaryRows,
      },
      breakdownSheet("By block", data.byBlock),
      breakdownSheet("By faculty", data.byFaculty),
      breakdownSheet("By gender", data.byGender),
      breakdownSheet("By nationality", data.byNationality),
      { name: "All students", headers: STUDENT_HEADERS, rows: filtered.map(studentRowToArray) },
      ...data.cohorts
        .filter((c) => c.total > 0)
        .map((c) => ({
          name: c.label,
          headers: STUDENT_HEADERS,
          rows: filtered.filter((r) => r.cohort === c.cohort).map(studentRowToArray),
        })),
    ]

    downloadBlob(buildXlsx(sheets), `${exportLabel}.xlsx`)
  }

  function onExportCsv() {
    const rows = filtered.map((r) => ({
      "Matric No.": r.matricId,
      Name: r.name,
      Cohort: cohortLabel(r.cohort),
      Gender: r.gender,
      Faculty: r.faculty ?? "",
      Nationality: r.nationality,
      Block: r.block ?? "",
      Room: r.room ?? "",
      Registered: r.isRegistered ? "Yes" : "No",
      "Check-in": checkInLabel(r.checkInStatus),
      "App account": r.hasAccount ? "Yes" : "No",
    }))
    const csv = toCsv(STUDENT_HEADERS, rows)
    downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }), `${exportLabel}.csv`)
  }

  function onPrint() {
    const rowsHtml = filtered
      .map(
        (r, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escHtml(r.matricId)}</td>
          <td>${escHtml(r.name)}</td>
          <td>${escHtml(cohortLabel(r.cohort))}</td>
          <td>${escHtml(r.block ?? "—")}</td>
          <td>${escHtml(r.room ?? "—")}</td>
          <td>${r.isRegistered ? "Yes" : "No"}</td>
          <td>${escHtml(checkInLabel(r.checkInStatus))}</td>
          <td>${r.hasAccount ? "Yes" : "No"}</td>
        </tr>`,
      )
      .join("")
    const sub = `${data.intakeName ?? "Active intake"} · ${filtered.length} of ${data.totals.total} student(s)`
    printHtml(
      "Student Data",
      `${docHeader(logos, "Student Data", sub)}
       <div class="muted">Generated ${formatMalaysia(new Date())} · Malaysia time (UTC+8)</div>
       <table><thead><tr><th>#</th><th>Matric</th><th>Name</th><th>Cohort</th><th>Block</th><th>Room</th><th>Registered</th><th>Check-in</th><th>App</th></tr></thead><tbody>${rowsHtml || `<tr><td colspan="9">No students.</td></tr>`}</tbody></table>`,
    )
  }

  const lastSynced = data.lastSyncedAt ? formatMalaysia(new Date(data.lastSyncedAt)) : null

  return (
    <Box>
      <Alert
        severity="info"
        sx={{ mb: 2, borderRadius: 2, alignItems: "center" }}
        action={
          canSync ? (
            <KButton size="small" variant="outlined" icon="cloud_download" loading={syncing} onClick={onSync}>
              Sync now
            </KButton>
          ) : undefined
        }
      >
        <b>{data.intakeName ?? "No active intake"}</b>
        {" · "}
        {lastSynced ? `Google Sheet last synced ${lastSynced}` : "Google Sheet not synced yet"}
        {data.currentPrefix !== null ? ` · current intake prefix A${String(data.currentPrefix).padStart(2, "0")}` : ""}
      </Alert>

      <Bento sx={{ mb: 2.5 }}>
        <BentoItem span={3}>
          <MetricTile label="Jumlah pelajar" value={data.totals.total} icon="groups" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Mendaftar" value={data.totals.registered} icon="how_to_reg" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Belum mendaftar" value={data.totals.notRegistered} icon="pending" emphasis={data.totals.notRegistered > 0} />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Sudah check-in" value={data.totals.checkedIn} icon="login" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Belum check-in" value={data.totals.notCheckedIn} icon="logout" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Ada bilik" value={data.totals.withRoom} icon="meeting_room" />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Belum ada bilik" value={data.totals.withoutRoom} icon="pending" emphasis={data.totals.withoutRoom > 0} />
        </BentoItem>
        <BentoItem span={3}>
          <MetricTile label="Ada akaun app" value={data.totals.withAccount} icon="manage_accounts" />
        </BentoItem>
      </Bento>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5, mb: 2.5 }}>
        <SectionCard title="Ringkasan cohort" subtitle="Junior = intake tahun semasa · Senior = intake lebih lama">
          <Box sx={TABLE_SX}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Cohort</TableCell>
                  <TableCell align="right">Jumlah</TableCell>
                  <TableCell align="right">Mendaftar</TableCell>
                  <TableCell align="right">Check-in</TableCell>
                  <TableCell align="right">Ada bilik</TableCell>
                  <TableCell align="right">Ada akaun</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.cohorts.map((c) => (
                  <TableRow key={c.cohort}>
                    <TableCell><CohortChip cohort={c.cohort} /></TableCell>
                    <TableCell align="right">{c.total}</TableCell>
                    <TableCell align="right">{c.registered}</TableCell>
                    <TableCell align="right">{c.checkedIn}</TableCell>
                    <TableCell align="right">{c.withRoom}</TableCell>
                    <TableCell align="right">{c.withAccount}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Jumlah</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totals.total}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totals.registered}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totals.checkedIn}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totals.withRoom}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{data.totals.withAccount}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </SectionCard>

        <SectionCard title="Pecahan ikut blok" subtitle="Jumlah · mendaftar · check-in">
          <BreakdownTable rows={data.byBlock} keyLabel="Blok" />
        </SectionCard>
        <SectionCard title="Pecahan ikut fakulti" subtitle="Jumlah · mendaftar · check-in">
          <BreakdownTable rows={data.byFaculty} keyLabel="Fakulti" />
        </SectionCard>
        <SectionCard title="Pecahan ikut warganegara" subtitle="Jumlah · mendaftar · check-in">
          <BreakdownTable rows={data.byNationality} keyLabel="Warganegara" />
        </SectionCard>
      </Box>

      <SectionCard
        title="Senarai pelajar"
        subtitle={`${filtered.length} daripada ${data.totals.total} pelajar`}
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <KButton size="small" variant="outlined" icon="grid_on" onClick={onExportExcel}>Excel</KButton>
            <KButton size="small" variant="outlined" icon="download" onClick={onExportCsv}>CSV</KButton>
            <KButton size="small" variant="outlined" icon="print" onClick={onPrint}>Print</KButton>
          </Box>
        }
      >
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
          <TextField
            placeholder="Cari matric, nama, fakulti atau bilik"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <KIcon icon="search" size={18} sx={{ color: "text.disabled" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField select label="Blok" value={block} onChange={(e) => setBlock(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="all">Semua blok</MenuItem>
            {blockOptions.map((b) => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </TextField>
          <TextField select label="Status" value={status} onChange={(e) => setStatus(e.target.value as FilterStatus)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">Semua status</MenuItem>
            <MenuItem value="registered">Mendaftar</MenuItem>
            <MenuItem value="not_registered">Belum mendaftar</MenuItem>
            <MenuItem value="checked_in">Sudah check-in</MenuItem>
            <MenuItem value="not_checked_in">Belum check-in</MenuItem>
            <MenuItem value="no_room">Belum ada bilik</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
          {COHORT_CHIPS.map((c) => (
            <Box
              key={c.value}
              component="button"
              onClick={() => setCohort(c.value)}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: `${radius.pill}px`,
                border: "1px solid",
                borderColor: cohort === c.value ? "transparent" : "divider",
                backgroundColor: cohort === c.value ? "primary.main" : "background.paper",
                color: cohort === c.value ? "primary.contrastText" : "text.secondary",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
              }}
            >
              {c.label}
            </Box>
          ))}
        </Box>

        {filtered.length === 0 ? (
          <KEmpty compact icon="group" title="Tiada pelajar" body="Tiada pelajar sepadan dengan carian atau filter." />
        ) : (
          <Box sx={TABLE_SX}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow>
                  {["Matric", "Nama", "Cohort", "Fakulti", "Blok · Bilik", "Mendaftar", "Check-in", "Akaun"].map((h) => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.matricId}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.name}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>{s.gender} · {s.nationality}</Typography>
                    </TableCell>
                    <TableCell><CohortChip cohort={s.cohort} /></TableCell>
                    <TableCell>{s.faculty ?? "—"}</TableCell>
                    <TableCell>
                      {s.room ? <Typography variant="body2">{s.room}</Typography> : <Typography variant="body2" sx={{ color: "text.disabled" }}>Belum diassign</Typography>}
                    </TableCell>
                    <TableCell><StatusPill ok={s.isRegistered} yes="Mendaftar" no="Belum" /></TableCell>
                    <TableCell><StatusPill ok={isCheckedIn(s.checkInStatus)} yes={checkInLabel(s.checkInStatus)} no="Belum" /></TableCell>
                    <TableCell><StatusPill ok={s.hasAccount} yes="Ada" no="Tiada" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast?.msg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  )
}

function BreakdownTable({ rows, keyLabel }: { rows: BreakdownRow[]; keyLabel: string }) {
  if (rows.length === 0) {
    return <Typography variant="body2" sx={{ color: "text.secondary" }}>Tiada data.</Typography>
  }
  return (
    <Box sx={{ ...TABLE_SX, maxHeight: 320 }}>
      <Table size="small" sx={{ minWidth: 320 }}>
        <TableHead>
          <TableRow>
            <TableCell>{keyLabel}</TableCell>
            <TableCell align="right">Jumlah</TableCell>
            <TableCell align="right">Mendaftar</TableCell>
            <TableCell align="right">Check-in</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell>{r.key}</TableCell>
              <TableCell align="right">{r.total}</TableCell>
              <TableCell align="right">{r.registered}</TableCell>
              <TableCell align="right">{r.checkedIn}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

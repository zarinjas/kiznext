"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import Typography from "@mui/material/Typography"
import type { GridColDef } from "@mui/x-data-grid"
import { FilterBar } from "@/components/kiz/patterns/filter-bar"
import { SmartTable } from "@/components/kiz/patterns/smart-table"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import type { Role } from "@/lib/rbac"
import type { InvitationStatus } from "@/lib/invitations"
import { InvitationRowActions } from "./invitation-row-actions"
import { InviteDialog } from "./invite-dialog"

export interface InvitationRow {
  id: string
  email: string
  role: Role
  matricId: string | null
  name: string | null
  resident: boolean
  status: InvitationStatus
  invitedByName: string
  sentCount: number
  expiresAt: string
  createdAt: string
}

const STATUS_OPTIONS: InvitationStatus[] = ["pending", "accepted", "expired", "revoked"]
const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
}

export function InvitationsClient({ invitations }: { invitations: InvitationRow[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showInvite, setShowInvite] = useState(false)

  const filtered = invitations.filter((inv) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      inv.email.toLowerCase().includes(q) ||
      (inv.name?.toLowerCase().includes(q) ?? false) ||
      (inv.matricId?.toLowerCase().includes(q) ?? false)
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const columns: GridColDef[] = [
    {
      field: "email",
      headerName: "Recipient",
      flex: 1.4,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, letterSpacing: "-0.011em" }} noWrap>
            {row.name || row.email}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
            {row.email}
            {row.matricId ? ` · ${row.matricId}` : ""}
          </Typography>
        </Box>
      ),
    },
    {
      field: "role",
      headerName: "Role",
      width: 130,
      renderCell: ({ value }) => <StatusChip status={value as string} />,
    },
    {
      field: "resident",
      headerName: "Resident",
      width: 120,
      renderCell: ({ row }) =>
        row.resident ? (
          <StatusChip status="resident" />
        ) : (
          <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>
        ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: ({ value }) => <StatusChip status={value as string} />,
    },
    {
      field: "invitedByName",
      headerName: "Invited by",
      flex: 1,
      minWidth: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" noWrap>{value as string}</Typography>
      ),
    },
    {
      field: "sentCount",
      headerName: "Sent",
      width: 90,
      renderCell: ({ row }) => (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {row.sentCount}×
        </Typography>
      ),
    },
    {
      field: "expiresAt",
      headerName: "Expires",
      width: 120,
      renderCell: ({ value }) => (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>{formatDate(value as string)}</Typography>
      ),
    },
    {
      field: "actions",
      headerName: "",
      sortable: false,
      filterable: false,
      width: 130,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.25 }}>
          <InvitationRowActions id={row.id} email={row.email} status={row.status} />
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search by name, email or matric No.…" />
        </Box>
        <Button variant="contained" onClick={() => setShowInvite(true)} startIcon={<KIcon icon="mail" size={17} />}>
          Invite
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
        <Chip
          label="All"
          size="small"
          onClick={() => setStatusFilter("all")}
          sx={{
            backgroundColor: statusFilter === "all" ? "primary.main" : "transparent",
            color: statusFilter === "all" ? "#fff" : "text.secondary",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: statusFilter === "all" ? "primary.main" : "action.hover" },
          }}
        />
        {STATUS_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={STATUS_LABELS[s]}
            size="small"
            onClick={() => setStatusFilter(s)}
            sx={{
              backgroundColor: statusFilter === s ? "primary.main" : "transparent",
              color: statusFilter === s ? "#fff" : "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { backgroundColor: statusFilter === s ? "primary.main" : "action.hover" },
            }}
          />
        ))}
      </Box>

      <SmartTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyIcon="mail"
        emptyTitle={
          search || statusFilter !== "all" ? "No invitations match your filters" : "No invitations yet"
        }
        emptyBody={
          search || statusFilter !== "all"
            ? undefined
            : "Click 'Invite' to send your first invitation email."
        }
      />

      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} />}
    </Box>
  )
}

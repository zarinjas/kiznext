"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import type { GridColDef } from "@mui/x-data-grid"
import { FilterBar } from "@/components/kiz/patterns/filter-bar"
import { SmartTable } from "@/components/kiz/patterns/smart-table"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import { color } from "@/lib/theme"
import type { AccountStatus, Role } from "@/lib/rbac"
import { UserForm } from "./user-form"
import { ResetPasswordDialog } from "./reset-password-dialog"
import { DeleteUserButton } from "./delete-user-button"
import { ActivateUserButton } from "./activate-user-button"
import { ResendVerificationButton } from "./resend-verification-button"

export interface UserRow {
  id: string
  matricId: string
  name: string
  email: string | null
  phone: string | null
  role: Role
  accountStatus: AccountStatus
  emailVerifiedAt: string | null
  block: string | null
  roomNumber: string | null
  createdAt: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
  isSuperAdmin: boolean
}

const ROLE_OPTIONS: Role[] = ["superadmin", "admin_kiz", "pengetua", "ahli", "staf"]
const ACCOUNT_OPTIONS: AccountStatus[] = ["unverified", "pending", "active"]
const ACCOUNT_LABELS: Record<AccountStatus, string> = {
  unverified: "Unverified",
  pending: "Pending",
  active: "Active",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
}

export function UsersClient({ users, currentUserId, isSuperAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState<UserRow | null>(null)

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q || u.name.toLowerCase().includes(q) || u.matricId.toLowerCase().includes(q)
    const matchesRole = roleFilter === "all" || u.role === roleFilter
    const matchesAccount = accountFilter === "all" || u.accountStatus === accountFilter
    return matchesSearch && matchesRole && matchesAccount
  })

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "User",
      flex: 1.4,
      minWidth: 260,
      sortComparator: (a, b) => String(a).localeCompare(String(b)),
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, letterSpacing: "-0.011em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.name}
            </Typography>
            {row.id === currentUserId && (
              <Chip
                label="You"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  flexShrink: 0,
                  backgroundColor: color.accent[100],
                  color: color.accent[700],
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>{row.matricId}</Typography>
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
      field: "accountStatus",
      headerName: "Account",
      width: 130,
      renderCell: ({ value }) => <StatusChip status={value as string} />,
    },
    {
      field: "email",
      headerName: "Contact",
      flex: 1.1,
      minWidth: 170,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
          {row.email ? (
            <Typography variant="body2" noWrap>{row.email}</Typography>
          ) : null}
          {row.phone ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>{row.phone}</Typography>
          ) : null}
          {!row.email && !row.phone && (
            <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>
          )}
        </Box>
      ),
    },
    {
      field: "room",
      headerName: "Room",
      width: 150,
      renderCell: ({ row }) =>
        row.block && row.roomNumber ? (
          <Typography variant="body2" noWrap>{`${row.block} · ${row.roomNumber}`}</Typography>
        ) : (
          <Typography variant="body2" sx={{ color: "text.disabled" }}>—</Typography>
        ),
    },
    {
      field: "createdAt",
      headerName: "Joined",
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
      width: 152,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {row.accountStatus === "unverified" && (
            <ResendVerificationButton userId={row.id} userName={row.name} />
          )}
          {row.accountStatus === "pending" && (
            <ActivateUserButton userId={row.id} userName={row.name} userMatricId={row.matricId} />
          )}
          {row.accountStatus === "active" && (
            <>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}>
                  <KIcon icon="edit" size={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset password">
                <IconButton size="small" onClick={() => setResetting(row)} aria-label={`Reset password for ${row.name}`}>
                  <KIcon icon="key" size={18} />
                </IconButton>
              </Tooltip>
            </>
          )}
          <DeleteUserButton
            userId={row.id}
            userName={row.name}
            userMatricId={row.matricId}
            isSelf={row.id === currentUserId}
          />
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Search by name or matric ID…" />
        </Box>
        <Button variant="contained" onClick={() => setShowCreate(true)} startIcon={<KIcon icon="person_add" size={17} />}>
          Add User
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
        <Chip
          label="All"
          size="small"
          onClick={() => setRoleFilter("all")}
          sx={{
            backgroundColor: roleFilter === "all" ? "primary.main" : "transparent",
            color: roleFilter === "all" ? "#fff" : "text.secondary",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: roleFilter === "all" ? "primary.main" : "action.hover" },
          }}
        />
        {ROLE_OPTIONS.map((r) => (
          <Chip
            key={r}
            label={ROLE_LABELS[r]}
            size="small"
            onClick={() => setRoleFilter(r)}
            sx={{
              backgroundColor: roleFilter === r ? "primary.main" : "transparent",
              color: roleFilter === r ? "#fff" : "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { backgroundColor: roleFilter === r ? "primary.main" : "action.hover" },
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5, alignItems: "center" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", mr: 0.5 }}>
          Account:
        </Typography>
        <Chip
          label="All"
          size="small"
          onClick={() => setAccountFilter("all")}
          sx={{
            backgroundColor: accountFilter === "all" ? "primary.main" : "transparent",
            color: accountFilter === "all" ? "#fff" : "text.secondary",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: accountFilter === "all" ? "primary.main" : "action.hover" },
          }}
        />
        {ACCOUNT_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={ACCOUNT_LABELS[s]}
            size="small"
            onClick={() => setAccountFilter(s)}
            sx={{
              backgroundColor: accountFilter === s ? "primary.main" : "transparent",
              color: accountFilter === s ? "#fff" : "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { backgroundColor: accountFilter === s ? "primary.main" : "action.hover" },
            }}
          />
        ))}
      </Box>

      <SmartTable
        columns={columns}
        rows={filtered}
        getRowId={(row) => row.id}
        emptyIcon="group"
        emptyTitle={
          search || roleFilter !== "all" || accountFilter !== "all"
            ? "No users match your filters"
            : "No users yet"
        }
        emptyBody={
          search || roleFilter !== "all" || accountFilter !== "all"
            ? undefined
            : "Click 'Add User' to create the first account."
        }
      />

      <KDialog open={showCreate} onClose={() => setShowCreate(false)} title="Add User" icon="person_add">
        <UserForm isSuperAdmin={isSuperAdmin} onClose={() => setShowCreate(false)} />
      </KDialog>

      {editing && (
        <KDialog open onClose={() => setEditing(null)} title={`Edit: ${editing.name}`} icon="edit">
          <UserForm
            isSuperAdmin={isSuperAdmin}
            onClose={() => setEditing(null)}
            initialData={{
              id: editing.id,
              matricId: editing.matricId,
              name: editing.name,
              email: editing.email ?? "",
              phone: editing.phone ?? "",
              role: editing.role,
            }}
          />
        </KDialog>
      )}

      {resetting && (
        <ResetPasswordDialog
          user={{ id: resetting.id, name: resetting.name, matricId: resetting.matricId }}
          onClose={() => setResetting(null)}
        />
      )}
    </Box>
  )
}

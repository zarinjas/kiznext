"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import { createUser, updateUser } from "./actions"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import type { Role } from "@/lib/rbac"

export interface UserFormData {
  id?: string
  matricId: string
  name: string
  email: string
  phone: string
  role: Role
}

interface Props {
  initialData?: UserFormData
  isSuperAdmin: boolean
  onClose: () => void
}

const ROLE_OPTIONS: Role[] = ["superadmin", "admin_kiz", "pengetua", "ahli"]

export function UserForm({ initialData, isSuperAdmin, onClose }: Props) {
  const router = useRouter()
  const isEditing = !!initialData?.id

  const [role, setRole] = useState<Role>(initialData?.role ?? "ahli")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const roleOptions = isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r !== "superadmin")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const input = {
      matricId: (form.get("matricId") as string) ?? "",
      name: (form.get("name") as string) ?? "",
      email: (form.get("email") as string) ?? "",
      phone: (form.get("phone") as string) ?? "",
      role,
    }

    try {
      if (isEditing && initialData?.id) {
        await updateUser(initialData.id, input)
      } else {
        await createUser({ ...input, password })
      }
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          id="matricId"
          name="matricId"
          label="Matric ID"
          required
          disabled={isEditing}
          defaultValue={initialData?.matricId}
          placeholder="e.g. A123456"
          helperText={isEditing ? "Matric ID can't be changed once created." : "Used to log in. Saved in uppercase."}
        />

        <TextField id="name" name="name" label="Full Name" required defaultValue={initialData?.name} placeholder="e.g. Nurul Aisyah Rahman" />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField id="email" name="email" label="Email (optional)" type="email" defaultValue={initialData?.email ?? ""} placeholder="name@ukm.edu.my" />
          <TextField id="phone" name="phone" label="Phone (optional)" defaultValue={initialData?.phone ?? ""} placeholder="e.g. 0123456789" />
        </Box>

        <TextField
          id="role"
          name="role"
          label="Role"
          select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          slotProps={{
            select: {
              renderValue: (v) => ROLE_LABELS[v as Role],
            },
          }}
        >
          {roleOptions.map((r) => (
            <MenuItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </MenuItem>
          ))}
        </TextField>

        {!isEditing && (
          <TextField
            id="password"
            name="password"
            label="Password"
            required
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      tabIndex={-1}
                    >
                      <KIcon icon={showPassword ? "visibility_off" : "visibility"} size={19} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={onClose} disabled={loading} variant="outlined">
            Cancel
          </Button>
          <KButton type="submit" loading={loading} icon={isEditing ? "save" : "person_add"}>
            {loading ? "Saving…" : isEditing ? "Save Changes" : "Add User"}
          </KButton>
        </Box>
      </Box>
    </form>
  )
}

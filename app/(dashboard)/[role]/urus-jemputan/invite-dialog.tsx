"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Alert from "@mui/material/Alert"
import Button from "@mui/material/Button"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KButton } from "@/components/kiz/primitives/k-button"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import { color } from "@/lib/theme"
import type { Role } from "@/lib/rbac"
import { sendInvitations } from "./actions"

const INVITABLE_ROLES: Role[] = ["ahli", "admin_kiz"]

interface ResultRow {
  email: string
  ok: boolean
  reason?: string
  resident?: boolean
}

function parseRecipients(text: string): { email: string; matricId?: string; name?: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim())
      const email = parts[0] ?? ""
      const matricId = parts[1] ?? ""
      const name = parts.slice(2).join(", ").trim()
      return { email, matricId: matricId || undefined, name: name || undefined }
    })
}

export function InviteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [role, setRole] = useState<Role>("ahli")
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<ResultRow[] | null>(null)

  const recipients = parseRecipients(text)
  const sent = results?.filter((r) => r.ok).length ?? 0
  const failed = results?.filter((r) => !r.ok) ?? []

  async function handleSend() {
    if (!recipients.length) {
      setError("Add at least one recipient.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await sendInvitations(role, recipients)
      setResults(res)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the invitations — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KDialog
      open
      onClose={onClose}
      title="Invite People"
      icon="mail"
      maxWidth="md"
      actions={
        results ? (
          <Button onClick={onClose} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={loading} variant="outlined">
              Cancel
            </Button>
            <KButton onClick={handleSend} loading={loading} icon="send">
              {loading
                ? "Sending…"
                : recipients.length
                  ? `Send ${recipients.length} Invitation${recipients.length === 1 ? "" : "s"}`
                  : "Send Invitations"}
            </KButton>
          </>
        )
      }
    >
      {results ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Alert severity={sent > 0 ? "success" : "error"} variant="standard">
            {sent} invitation{sent === 1 ? "" : "s"} sent
            {failed.length ? `, ${failed.length} couldn't be sent.` : "."}
          </Alert>

          {failed.length > 0 && (
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              {failed.map((row, i) => (
                <Box
                  key={`${row.email}-${i}`}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    px: 1.5,
                    py: 1,
                    borderTop: i === 0 ? "none" : "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {row.email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: color.danger.ink, flexShrink: 0 }}>
                    {row.reason ?? "Failed"}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            id="invite-role"
            label="Invite as"
            select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            fullWidth
            slotProps={{ select: { renderValue: (v) => ROLE_LABELS[v as Role] } }}
          >
            {INVITABLE_ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            id="invite-recipients"
            label="Recipients"
            placeholder={"you@example.com, A123456, Full Name\nteammate@ukm.edu.my, , Full Name"}
            multiline
            minRows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            helperText="One person per line: email, matric No., full name. Matric and name are optional — but for students, a matric that matches the active intake marks them as a resident automatically."
            slotProps={{ htmlInput: { style: { fontFamily: "var(--font-mono), monospace", fontSize: 13 } } }}
          />

          <Alert severity="info" variant="standard" icon={<span className="material-symbols-rounded" style={{ fontSize: 20 }}>info</span>}>
            {role === "ahli"
              ? "Students self-register from the emailed link. If their matric No. is already on the KIZ resident list, their account is activated as a resident straight away."
              : "Admin KIZ invitations are for staff — they self-register from the link and get admin access once their email is confirmed. No resident status is applied."}
          </Alert>

          {error && <Alert severity="error" variant="standard">{error}</Alert>}
        </Box>
      )}
    </KDialog>
  )
}

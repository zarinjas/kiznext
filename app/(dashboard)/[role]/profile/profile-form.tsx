"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import { updateProfile } from "./actions"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface ProfileUser {
  name: string
  email: string | null
  matricId: string
  block: string | null
  roomNumber: string | null
  phone: string | null
  role: string
  avatarUrl: string | null
  gender: "male" | "female" | null
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "")
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setDone(false)

    const form = new FormData(e.currentTarget)

    try {
      await updateProfile({
        name: form.get("name") as string,
        email: (form.get("email") as string) ?? "",
        block: (form.get("block") as string) ?? "",
        roomNumber: (form.get("roomNumber") as string) ?? "",
        phone: (form.get("phone") as string) ?? "",
        avatarUrl,
      })
      setDone(true)
      router.refresh()
    } catch {
      // handle error
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Avatar */}
      <FormSection title="Profile Photo" icon="person">
        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2.5, alignItems: "center" }}>
          <Box sx={{ position: "relative" }}>
            {avatarUrl ? (
              <Box component="img" src={avatarUrl} alt="" sx={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "2px solid", borderColor: "primary.main" }} />
            ) : (
              <Box
                sx={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "action.hover",
                  color: "text.primary",
                  fontSize: 30,
                  fontWeight: 600,
                }}
              >
                {user.name.trim().charAt(0).toUpperCase()}
              </Box>
            )}
            <Box
              component="label"
              htmlFor="avatar-upload"
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: "50%",
                backgroundColor: color.brand[600],
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: 2,
                "&:hover": { backgroundColor: color.brand[700] },
              }}
            >
              <KIcon icon="photo_camera" size={16} />
            </Box>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              hidden
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                const fd = new FormData()
                fd.append("file", file)
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: fd })
                  const data = await res.json().catch(() => ({}))
                  if (!res.ok || !data.url) {
                    alert(data.error || "Upload didn't go through — try again.")
                    return
                  }
                  setAvatarUrl(data.url)
                } catch {
                  alert("Upload didn't go through — try again.")
                } finally {
                  setUploading(false)
                }
              }}
            />
          </Box>
          <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
            {uploading && <Typography variant="caption" sx={{ color: "text.secondary" }}>Uploading…</Typography>}
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.name}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{user.matricId}</Typography>
          </Box>
        </Box>
      </FormSection>

      <FormSection title="Personal Information" icon="badge">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField id="matricId" label="Matric No." value={user.matricId} disabled />
          <TextField
            id="gender"
            label="Gender"
            value={user.gender ? (user.gender === "male" ? "Male" : "Female") : "—"}
            disabled
            helperText="From your intake record — contact the KIZ office if this is wrong."
          />
          <TextField id="name" name="name" label="Name" defaultValue={user.name} required />
          <TextField id="email" name="email" label="Email" type="email" defaultValue={user.email ?? ""} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField id="block" name="block" label="Block" defaultValue={user.block ?? ""} />
            <TextField id="roomNumber" name="roomNumber" label="Room No." defaultValue={user.roomNumber ?? ""} />
          </Box>
          <TextField id="phone" name="phone" label="Phone No." type="tel" defaultValue={user.phone ?? ""} />
        </Box>
      </FormSection>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <KButton type="submit" loading={saving} icon="save">
          {saving ? "Saving…" : "Save Changes"}
        </KButton>
        {done && (
          <Alert severity="success" sx={{ flex: 1 }}>Yay! Your profile is looking good.</Alert>
        )}
      </Box>
    </form>
  )
}

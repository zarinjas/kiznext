"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import type { LaundryMachineView } from "@/lib/laundry-meta"
import {
  clearMachineReminder,
  createLaundryMachine,
  deleteLaundryMachine,
  removeLaundryDefaultImage,
  setLaundryDefaultImage,
  setMachineOutOfService,
  updateLaundryMachine,
  type LaundryMachineInput,
} from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { Surface } from "@/components/kiz/primitives/list-group"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

const MAX_SIZE = 12 * 1024 * 1024

function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso))
}

interface FormState {
  id: string | null
  name: string
  location: string
  imageUrl: string | null
  sortOrder: string
}

const EMPTY_FORM: FormState = { id: null, name: "", location: "", imageUrl: null, sortOrder: "0" }

export function LaundryAdmin({
  initialMachines,
  defaultImageUrl,
  readOnly,
}: {
  initialMachines: LaundryMachineView[]
  defaultImageUrl: string | null
  readOnly: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingDefault, setUploadingDefault] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LaundryMachineView | null>(null)
  const [toast, setToast] = useState<{ msg: string; sev: "success" | "error" } | null>(null)

  function notify(msg: string, sev: "success" | "error" = "success") {
    setToast({ msg, sev })
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, sortOrder: String(initialMachines.length) })
  }

  function openEdit(m: LaundryMachineView) {
    setForm({ id: m.id, name: m.name, location: m.location ?? "", imageUrl: m.imageUrl, sortOrder: String(m.sortOrder) })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !form) return
    if (file.size > MAX_SIZE) {
      notify("That file's a bit chunky — keep it under 12MB.", "error")
      return
    }
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("dir", "laundry")
      const res = await fetch("/api/upload", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload didn't go through.")
      setForm((f) => (f ? { ...f, imageUrl: data.url as string } : f))
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload didn't go through — try again.", "error")
    } finally {
      setUploading(false)
    }
  }

  async function handleDefaultUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE) {
      notify("That file's a bit chunky — keep it under 12MB.", "error")
      return
    }
    setUploadingDefault(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("dir", "laundry")
      const res = await fetch("/api/upload", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Upload didn't go through.")
      await setLaundryDefaultImage(data.url as string)
      notify("Default machine photo updated.")
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Upload didn't go through — try again.", "error")
    } finally {
      setUploadingDefault(false)
    }
  }

  async function handleDefaultRemove() {
    setUploadingDefault(true)
    try {
      await removeLaundryDefaultImage()
      notify("Default machine photo removed.")
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't remove it — try again.", "error")
    } finally {
      setUploadingDefault(false)
    }
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    const input: LaundryMachineInput = {
      name: form.name,
      location: form.location,
      imageUrl: form.imageUrl,
      sortOrder: Number(form.sortOrder),
    }
    try {
      if (form.id) await updateLaundryMachine(form.id, input)
      else await createLaundryMachine(input)
      setForm(null)
      notify(form.id ? "Machine updated." : "Machine added.")
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't save — try again.", "error")
    } finally {
      setSaving(false)
    }
  }

  async function toggleOutOfService(m: LaundryMachineView) {
    setBusyId(m.id)
    try {
      await setMachineOutOfService(m.id, !m.outOfService)
      notify(m.outOfService ? `${m.name} is back in service.` : `${m.name} marked out of service.`)
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't update — try again.", "error")
    } finally {
      setBusyId(null)
    }
  }

  async function clearReminder(m: LaundryMachineView) {
    setBusyId(m.id)
    try {
      await clearMachineReminder(m.id)
      notify(`Reminder on ${m.name} cleared.`)
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't clear — try again.", "error")
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await deleteLaundryMachine(deleteTarget.id)
      setDeleteTarget(null)
      notify("Machine removed.")
      router.refresh()
    } catch (err) {
      notify(err instanceof Error ? err.message : "Couldn't remove — try again.", "error")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Surface padded sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap" }}>
          {defaultImageUrl ? (
            <Box
              component="img"
              src={defaultImageUrl}
              alt="Default machine"
              sx={{ width: 96, height: 96, borderRadius: 1.5, objectFit: "cover", flexShrink: 0, border: "1px solid", borderColor: "divider" }}
            />
          ) : (
            <Box
              sx={{
                width: 96,
                height: 96,
                borderRadius: 1.5,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: color.canvasSunk,
                color: "text.disabled",
                border: "1px dashed",
                borderColor: color.borderStrong,
              }}
            >
              <KIcon icon="image" size={30} />
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography sx={{ fontWeight: 650 }}>Default machine photo</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
              Shown on any machine that doesn&apos;t have its own photo. Use a square image —{" "}
              <strong>800 × 800 px</strong> recommended (min 400 × 400), PNG/JPG/WebP, up to 12&nbsp;MB.
            </Typography>
            {!readOnly && (
              <Box sx={{ display: "flex", gap: 1, mt: 1.25, flexWrap: "wrap" }}>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={uploadingDefault}
                  startIcon={<KIcon icon="upload" size={16} />}
                  sx={{ textTransform: "none" }}
                >
                  {uploadingDefault ? "Uploading…" : defaultImageUrl ? "Replace" : "Upload photo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleDefaultUpload} />
                </Button>
                {defaultImageUrl && (
                  <Button
                    variant="text"
                    color="error"
                    disabled={uploadingDefault}
                    onClick={handleDefaultRemove}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Surface>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        {!readOnly && (
          <KButton icon="add" onClick={openAdd}>
            Add machine
          </KButton>
        )}
      </Box>

      {initialMachines.length === 0 ? (
        <KEmpty
          icon="local_laundry_service"
          title="No machines yet"
          body={readOnly ? "The KIZ office hasn't added any laundry machines." : "Add the first machine residents can use."}
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
          {initialMachines.map((m) => {
            const thumb = m.imageUrl ?? defaultImageUrl
            return (
            <Surface key={m.id} padded>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {thumb ? (
                  <Box
                    component="img"
                    src={thumb}
                    alt={m.name}
                    sx={{ width: 64, height: 64, borderRadius: 1.5, objectFit: "cover", flexShrink: 0, border: "1px solid", borderColor: "divider" }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 1.5,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: color.canvasSunk,
                      color: "text.disabled",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <KIcon icon="local_laundry_service" size={26} />
                  </Box>
                )}

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 650 }} noWrap>
                      {m.name}
                    </Typography>
                    <StatusChip status={m.state} />
                  </Box>
                  {m.location && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {m.location}
                    </Typography>
                  )}
                  {m.reminder && (
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
                      {m.reminder.userName} · ends {formatClock(m.reminder.endsAt)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {!readOnly && (
                <Box sx={{ display: "flex", gap: 1, mt: 1.75, flexWrap: "wrap" }}>
                  <Button size="small" variant="outlined" onClick={() => openEdit(m)} sx={{ textTransform: "none" }}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color={m.outOfService ? "success" : "warning"}
                    disabled={busyId === m.id}
                    onClick={() => toggleOutOfService(m)}
                    sx={{ textTransform: "none" }}
                  >
                    {m.outOfService ? "Back in service" : "Out of service"}
                  </Button>
                  {m.state === "laundry_active" && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busyId === m.id}
                      onClick={() => clearReminder(m)}
                      sx={{ textTransform: "none" }}
                    >
                      Clear reminder
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => setDeleteTarget(m)}
                    sx={{ textTransform: "none", ml: "auto" }}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Surface>
            )
          })}
        </Box>
      )}

      <KDialog
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? "Edit machine" : "Add machine"}
        icon="local_laundry_service"
        actions={
          <>
            <Button onClick={() => setForm(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <KButton loading={saving} onClick={handleSave}>
              {form?.id ? "Save" : "Add"}
            </KButton>
          </>
        }
      >
        {form && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Machine name"
              size="small"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Machine 1"
            />
            <TextField
              label="Location"
              size="small"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Laundry Room, Block K18A"
            />
            <TextField
              label="Sort order"
              size="small"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.25 }}>
                Photo
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 1 }}>
                Optional — square image, 800 × 800 px recommended. Falls back to the default photo.
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  component="label"
                  variant="outlined"
                  disabled={uploading}
                  startIcon={<KIcon icon="upload" size={16} />}
                  sx={{ textTransform: "none" }}
                >
                  {uploading ? "Uploading…" : "Choose"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleUpload} />
                </Button>
                {form.imageUrl && (
                  <Box sx={{ position: "relative", width: 64, height: 64 }}>
                    <Box
                      component="img"
                      src={form.imageUrl}
                      alt="Machine"
                      sx={{ width: 64, height: 64, borderRadius: 1.5, objectFit: "cover", border: "1px solid", borderColor: "divider" }}
                    />
                    <Box
                      component="button"
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setForm({ ...form, imageUrl: null })}
                      sx={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </KDialog>

      <KDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove machine?"
        icon="delete"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <KButton loading={busyId === deleteTarget?.id} onClick={confirmDelete}>
              Remove
            </KButton>
          </>
        }
      >
        <Typography variant="body2">
          {deleteTarget?.name} will be hidden from residents. Past reminders are kept for history.
        </Typography>
      </KDialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toast?.sev ?? "success"} variant="filled" onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  )
}

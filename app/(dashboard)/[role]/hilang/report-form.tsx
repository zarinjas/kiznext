"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import { reportItem } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { LOST_FOUND_TYPES, KIZ_LOCATIONS, OTHER_LOCATION, lostFoundTypeMeta } from "@/lib/lost-found-meta"
import { color, radius } from "@/lib/theme"

interface Props {
  role: string
}

export function ReportForm({ role: _role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [type, setType] = useState<"lost" | "found" | null>(null)
  const [location, setLocation] = useState("")
  const [otherLocation, setOtherLocation] = useState("")

  const meta = type ? lostFoundTypeMeta(type) : null

  function chooseType(next: "lost" | "found") {
    setError("")
    setType((prev) => (prev === next ? null : next))
  }

  function chooseLocation(next: string) {
    setError("")
    setLocation(next)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!type) {
      setError("Pick one first — did you lose something, or did you find something?")
      setLoading(false)
      return
    }

    const form = new FormData(e.currentTarget)
    try {
      await reportItem(form)
      router.refresh()
      ;(e.target as HTMLFormElement).reset()
      setType(null)
      setLocation("")
      setOtherLocation("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oops, something slipped — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="type" value={type ?? ""} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* ── What happened — lost or found ───────────────────────────────── */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 650,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              display: "block",
              mb: 1,
            }}
          >
            What&apos;s your report about? <Box component="span" sx={{ color: color.danger.main }}>*</Box>
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: { xs: 1, sm: 1.5 } }}>
            {LOST_FOUND_TYPES.map((t) => {
              const selected = type === t.value
              return (
                <Box
                  key={t.value}
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseType(t.value)}
                  sx={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                    textAlign: "left",
                    p: { xs: 1.5, sm: 2 },
                    minHeight: { xs: 104, sm: 116 },
                    borderRadius: `${radius.card}px`,
                    border: "1.5px solid",
                    borderColor: selected ? t.tone.main : "divider",
                    backgroundColor: selected ? t.tone.soft : "background.paper",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    transition: "border-color 140ms, background-color 140ms",
                    "&:hover": { borderColor: selected ? t.tone.main : color.borderStrong },
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 34, sm: 40 },
                      height: { xs: 34, sm: 40 },
                      borderRadius: `${radius.input}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: selected ? "background.paper" : t.tone.soft,
                      color: selected ? t.tone.main : t.tone.ink,
                    }}
                  >
                    <KIcon icon={t.icon} size={20} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 650, fontSize: { xs: 13, sm: 14 }, lineHeight: 1.3, color: "text.primary" }}>
                      {t.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: { xs: "none", sm: "block" }, mt: 0.25 }}
                    >
                      {t.hint}
                    </Typography>
                  </Box>
                  {selected && (
                    <KIcon
                      icon="check_circle"
                      size={18}
                      sx={{ color: t.tone.main, position: "absolute", top: 10, right: 10 }}
                    />
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {!type && (
          <Typography variant="caption" sx={{ color: "text.disabled", mt: -1.5 }}>
            Choose one above to unlock the rest of the form.
          </Typography>
        )}

        {type && (
          <>
            {/* ── Item details ───────────────────────────────────────────── */}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: { xs: 2, sm: 1.5 } }}>
              <TextField
                id="itemName"
                name="itemName"
                label="Item"
                placeholder="e.g. Black wallet"
                required
              />
              <TextField
                id="location"
                name="location"
                select
                label={meta?.locationLabel}
                value={location}
                onChange={(e) => chooseLocation(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Pick a location…</MenuItem>
                {KIZ_LOCATIONS.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
                <MenuItem value={OTHER_LOCATION}>Other location…</MenuItem>
              </TextField>
            </Box>

            {location === OTHER_LOCATION && (
              <TextField
                id="locationOtherText"
                name="locationOtherText"
                label="Other location"
                placeholder="e.g. Outside Blok K19B, near the guard post"
                value={otherLocation}
                onChange={(e) => setOtherLocation(e.target.value)}
                sx={{ mt: { xs: 0, sm: -0.5 } }}
              />
            )}

            {/* ── When it happened ───────────────────────────────────────── */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontWeight: 650,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  display: "block",
                  mb: 1,
                }}
              >
                {meta?.whenLabel}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: { xs: 2, sm: 1.5 } }}>
                <TextField
                  id="happenedDate"
                  name="happenedDate"
                  label="Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
                <TextField
                  id="happenedTime"
                  name="happenedTime"
                  label="Approx. time (optional)"
                  type="time"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
            </Box>

            <TextField
              id="description"
              name="description"
              label="Description"
              placeholder={
                type === "lost"
                  ? "Colour, brand, anything that makes it recognisable…"
                  : "Details so the owner can confirm it's theirs…"
              }
              multiline
              minRows={3}
              required
            />
            <TextField
              id="photo"
              name="photo"
              label="Photo (optional)"
              type="file"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { accept: "image/*" } }}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
              <KButton type="submit" loading={loading} icon="add_alert" sx={{ width: { xs: "100%", sm: "auto" } }}>
                {loading ? "Submitting…" : type === "lost" ? "Report Lost Item" : "Report Found Item"}
              </KButton>
            </Box>
          </>
        )}
      </Box>
    </form>
  )
}

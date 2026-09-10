"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import { createTicket } from "./actions"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { HELPDESK_CATEGORIES, helpdeskCategoryMeta } from "@/lib/helpdesk-meta"
import { color, radius } from "@/lib/theme"
import type { HelpdeskCategory } from "@/app/generated/prisma/client"

interface Props {
  role: string
  /** Residential block names available for the location picker. */
  blocks: string[]
  /** The student's published block/room (null until allocations are published). */
  defaultBlock?: string | null
  defaultRoom?: string | null
}

type LocationType = "room" | "facility" | null

export function NewTicketForm({ role, blocks, defaultBlock, defaultRoom }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [category, setCategory] = useState<HelpdeskCategory | null>(null)
  const [locationType, setLocationType] = useState<LocationType>(
    defaultBlock && defaultRoom ? "room" : null,
  )
  const [block, setBlock] = useState(defaultBlock && defaultRoom ? defaultBlock : "")
  const [room, setRoom] = useState(defaultRoom ?? "")
  const [facility, setFacility] = useState("")

  const blockOptions = Array.from(new Set([...(defaultBlock ? [defaultBlock] : []), ...blocks]))

  function chooseCategory(value: HelpdeskCategory) {
    setCategory((prev) => (prev === value ? null : value))
    setError("")
  }

  function chooseLocation(next: Exclude<LocationType, null>) {
    setError("")
    if (locationType === next) {
      setLocationType(null)
      return
    }
    setLocationType(next)
    if (next === "room") {
      if (!block && defaultBlock) setBlock(defaultBlock)
      if (!room && defaultRoom) setRoom(defaultRoom)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const subject = (form.get("subject") as string)?.trim() ?? ""
    const message = (form.get("message") as string)?.trim() ?? ""

    if (!category) {
      setError("Pick a category so we can route your request to the right team.")
      setLoading(false)
      return
    }
    if (!subject) {
      setError("Tell us briefly what this is about.")
      setLoading(false)
      return
    }

    const locationBlock = locationType === "room" ? block.trim() || null : null
    const locationDetail =
      locationType === "room"
        ? room.trim() || null
        : locationType === "facility"
          ? facility.trim() || null
          : null

    try {
      const ticketId = await createTicket({
        subject,
        message,
        category,
        locationBlock,
        locationDetail,
      })
      router.push(`/${role}/helpdesk/${ticketId}`)
    } catch {
      setError("Oops, something went sideways. Give it another try.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* ── Category ─────────────────────────────────────────────────────── */}
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 650, letterSpacing: "0.02em", textTransform: "uppercase", display: "block", mb: 1 }}>
            Category <Box component="span" sx={{ color: color.danger.main }}>*</Box>
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
              gap: 1,
            }}
          >
            {HELPDESK_CATEGORIES.map((c) => {
              const selected = category === c.value
              return (
                <Box
                  key={c.value}
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseCategory(c.value)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    textAlign: "left",
                    p: 1.25,
                    minHeight: 58,
                    borderRadius: `${radius.card}px`,
                    border: "1.5px solid",
                    borderColor: selected ? color.brand[600] : "divider",
                    backgroundColor: selected ? color.brand[50] : "background.paper",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    WebkitTapHighlightColor: "transparent",
                    transition: "border-color 140ms, background-color 140ms",
                    "&:hover": { borderColor: selected ? color.brand[600] : color.borderStrong },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: `${radius.input}px`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: c.tone.soft,
                      color: c.tone.ink,
                    }}
                  >
                    <KIcon icon={c.icon} size={17} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3, color: "text.primary" }}>
                      {c.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {c.hint}
                    </Typography>
                  </Box>
                  {selected && (
                    <KIcon icon="check_circle" size={18} sx={{ color: color.brand[600], flexShrink: 0, marginLeft: "auto" }} />
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* ── What's going on ─────────────────────────────────────────────── */}
        <TextField
          id="subject"
          name="subject"
          label="What's going on?"
          placeholder="e.g. Water leaking from bathroom pipe"
          required
        />

        {/* ── Location ────────────────────────────────────────────────────── */}
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 650, letterSpacing: "0.02em", textTransform: "uppercase", display: "block", mb: 1 }}>
            Where is this about? <Box component="span" sx={{ color: "text.disabled", textTransform: "none", fontWeight: 500 }}>(optional)</Box>
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {(
              [
                { value: "room", label: "My room", icon: "meeting_room" },
                { value: "facility", label: "A facility or elsewhere", icon: "apartment" },
              ] as const
            ).map((opt) => {
              const selected = locationType === opt.value
              return (
                <Box
                  key={opt.value}
                  component="button"
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseLocation(opt.value)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.625,
                    px: 1.5,
                    py: 0.875,
                    minHeight: 40,
                    borderRadius: "999px",
                    border: "1.5px solid",
                    borderColor: selected ? color.brand[600] : "divider",
                    backgroundColor: selected ? color.brand[50] : "background.paper",
                    color: selected ? color.brand[700] : "text.secondary",
                    cursor: "pointer",
                    fontSize: 13.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "border-color 140ms, background-color 140ms",
                    "&:hover": { borderColor: selected ? color.brand[600] : color.borderStrong },
                  }}
                >
                  <KIcon icon={opt.icon} size={16} />
                  {opt.label}
                </Box>
              )
            })}
          </Box>

          {locationType === "room" && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mt: 1.5 }}>
              <TextField
                id="block"
                select
                label="Block"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                fullWidth
              >
                <MenuItem value="">No block / not sure</MenuItem>
                {blockOptions.map((b) => (
                  <MenuItem key={b} value={b}>
                    Block {b}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                id="room"
                label="Room number"
                placeholder={defaultRoom ?? "e.g. 211"}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                fullWidth
              />
            </Box>
          )}

          {locationType === "facility" && (
            <TextField
              id="facility"
              label="Facility or place"
              placeholder="e.g. Dewan Sutera, Level 1 lounge, guard post…"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              fullWidth
              sx={{ mt: 1.5 }}
            />
          )}
        </Box>

        {/* ── More detail ─────────────────────────────────────────────────── */}
        <TextField
          id="message"
          name="message"
          label="Add more detail"
          placeholder={
            helpdeskCategoryMeta(category ?? "general_enquiry").value === "maintenance_repair"
              ? "What happened, when did it start, is it affecting power/water?…"
              : "Share anything that helps us help you faster…"
          }
          multiline
          minRows={3}
        />
        <Typography variant="caption" sx={{ color: "text.disabled", mt: -1.5 }}>
          Every request becomes a private conversation — we reply in the thread below.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <KButton type="submit" loading={loading} icon="send">
          {loading ? "Sending…" : "Send request"}
        </KButton>
      </Box>
    </form>
  )
}

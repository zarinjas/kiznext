"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import FormControlLabel from "@mui/material/FormControlLabel"
import Switch from "@mui/material/Switch"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { createDestination, updateDestination, type DestinationInput } from "@/lib/direktori"
import {
  TYPE_OPTIONS,
  TYPE_LABELS,
  TYPE_ICONS,
  typeLabel,
} from "@/lib/direktori-meta"
import type { DestinationType } from "@/app/generated/prisma/client"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KButton } from "@/components/kiz/primitives/k-button"
import { color, radius } from "@/lib/theme"

interface DestinationView {
  id: string
  name: string
  type: DestinationType
  icon: string
  latitude: number
  longitude: number
  indoor: boolean
  building: string | null
  description: string | null
  sortOrder: number
}

interface Props {
  initial?: DestinationView | null
  onClose?: () => void
}

function parseNum(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function osmEmbedUrl(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null
  const span = 0.002
  const minLat = lat - span
  const maxLat = lat + span
  const minLng = lng - span
  const maxLng = lng + span
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`
}

export function DestinationForm({ initial, onClose }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)

  const [name, setName] = useState(initial?.name ?? "")
  const [type, setType] = useState<DestinationType>(initial?.type ?? "block")
  const [latStr, setLatStr] = useState(initial ? String(initial.latitude) : "")
  const [lngStr, setLngStr] = useState(initial ? String(initial.longitude) : "")
  const [indoor, setIndoor] = useState(initial?.indoor ?? false)
  const [building, setBuilding] = useState(initial?.building ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lat = parseNum(latStr)
  const lng = parseNum(lngStr)
  const previewUrl = useMemo(
    () => osmEmbedUrl(lat != null && lat >= -90 && lat <= 90 ? lat : null, lng != null && lng >= -180 && lng <= 180 ? lng : null),
    [lat, lng],
  )

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    if (lat == null || lng == null) {
      setError("Enter both latitude and longitude before saving.")
      setLoading(false)
      return
    }
    const data: DestinationInput = {
      name,
      type,
      latitude: lat,
      longitude: lng,
      indoor,
      building,
      description,
      sortOrder: parseInt(sortOrder, 10) || 0,
    }
    try {
      if (isEditing && initial) {
        await updateDestination(initial.id, data)
      } else {
        await createDestination(data)
      }
      router.refresh()
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Blok K18A"
        size="medium"
      />

      <TextField select label="Type" value={type} size="medium" onChange={(e) => setType(e.target.value as DestinationType)}>
        {TYPE_OPTIONS.map((t) => (
          <MenuItem key={t} value={t}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <KIcon icon={TYPE_ICONS[t]} size={17} />
              {TYPE_LABELS[t]}
            </Box>
          </MenuItem>
        ))}
      </TextField>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField
          label="Latitude"
          value={latStr}
          onChange={(e) => setLatStr(e.target.value)}
          size="medium"
          type="number"
          slotProps={{ htmlInput: { step: "any" } }}
          placeholder="-90 … 90"
        />
        <TextField
          label="Longitude"
          value={lngStr}
          onChange={(e) => setLngStr(e.target.value)}
          size="medium"
          type="number"
          slotProps={{ htmlInput: { step: "any" } }}
          placeholder="-180 … 180"
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          p: 1.5,
          borderRadius: `${radius.card}px`,
          backgroundColor: color.info.soft,
          color: color.info.ink,
          fontSize: 12.5,
        }}
      >
        <KIcon icon="info" size={16} sx={{ flexShrink: 0, marginTop: 1 }} />
        <Box sx={{ minWidth: 0 }}>
          Grab the pin from Google Maps: right-click the exact spot → “What’s here?” → copy the
          two numbers shown. Paste them here — the map below previews the spot.
        </Box>
      </Box>

      {previewUrl ? (
        <Box
          component="iframe"
          title="Pin preview"
          src={previewUrl}
          sx={{ width: "100%", height: 200, borderRadius: `${radius.card}px`, border: "1px solid", borderColor: "divider" }}
        />
      ) : (
        <Box
          sx={{
            width: "100%",
            height: 200,
            borderRadius: `${radius.card}px`,
            border: "1px dashed",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.disabled",
            fontSize: 13,
          }}
        >
          Enter coordinates to preview the pin
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={indoor}
              onChange={(e) => setIndoor(e.target.checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: color.brand[600] },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: color.brand[600] },
              }}
            />
          }
          label={
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 600 }}>Indoor</Box>
              <Box sx={{ fontSize: 12, color: "text.secondary" }}>
                Inside a building (e.g. a room in Bangunan Pentadbiran). GPS accuracy is coarser indoors.
              </Box>
            </Box>
          }
          sx={{ alignItems: "flex-start", gap: 1, mx: 0 }}
        />
        {indoor && (
          <TextField
            label="Building"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            size="medium"
            placeholder="e.g. Bangunan Pentadbiran"
          />
        )}
      </Box>

      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        size="medium"
        multiline
        minRows={2}
        placeholder="Optional — what is this place?"
      />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        <TextField
          label="Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          size="medium"
          type="number"
        />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: color.brand[50],
              color: color.brand[800],
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <KIcon icon={TYPE_ICONS[type]} size={15} />
            {typeLabel(type)}
          </Box>
        </Box>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: "error.main" }}>
          {error}
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined">
          Cancel
        </Button>
        <KButton loading={loading} icon={isEditing ? "save" : "add"} onClick={handleSubmit}>
          {isEditing ? "Save Changes" : "Add Destination"}
        </KButton>
      </Box>
    </Box>
  )
}

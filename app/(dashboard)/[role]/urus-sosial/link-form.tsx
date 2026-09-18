"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KButton } from "@/components/kiz/primitives/k-button"
import { SocialIcon } from "@/components/shared/social-icon"
import { createSocialLink, updateSocialLink } from "@/lib/stay-connected"
import { SOCIAL_ICON_KEYS, SOCIAL_ICON_META, normalizeSocialIcon } from "@/lib/social-meta"
import type { SocialLinkView } from "@/lib/stay-connected"

interface Props {
  initial?: SocialLinkView | null
  onClose?: () => void
}

/** Add / edit a single "Stay Connected" link. */
export function LinkForm({ initial, onClose }: Props) {
  const router = useRouter()
  const isEditing = Boolean(initial)

  const [label, setLabel] = useState(initial?.label ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [url, setUrl] = useState(initial?.url ?? "")
  const [icon, setIcon] = useState(normalizeSocialIcon(initial?.icon))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    if (!label.trim()) {
      setError("Give this link a label.")
      setLoading(false)
      return
    }
    if (!url.trim()) {
      setError("This link needs a URL.")
      setLoading(false)
      return
    }
    const data = { label, description, url, icon }
    try {
      if (isEditing && initial) {
        await updateSocialLink(initial.id, data)
      } else {
        await createSocialLink(data)
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
        label="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        size="medium"
        required
        placeholder="e.g. Instagram"
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        size="medium"
        placeholder="e.g. Follow us for campus updates"
      />
      <TextField
        label="URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        size="medium"
        required
        placeholder="https://instagram.com/mykiz"
        helperText="Opens in a new tab. Missing https:// is added automatically."
      />

      <TextField
        select
        label="Icon"
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        size="medium"
        slotProps={{
          select: {
            renderValue: (value) => (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <SocialIcon icon={value as string} size={18} />
                {SOCIAL_ICON_META[value as string]?.label ?? "Link"}
              </Box>
            ),
          },
        }}
      >
        {SOCIAL_ICON_KEYS.map((key) => (
          <MenuItem key={key} value={key}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <SocialIcon icon={key} size={18} />
              {SOCIAL_ICON_META[key].label}
            </Box>
          </MenuItem>
        ))}
      </TextField>

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
          {isEditing ? "Save Changes" : "Add Link"}
        </KButton>
      </Box>
    </Box>
  )
}

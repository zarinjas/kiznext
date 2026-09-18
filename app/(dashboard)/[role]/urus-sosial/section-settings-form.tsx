"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import { KButton } from "@/components/kiz/primitives/k-button"
import { SocialIcon } from "@/components/shared/social-icon"
import { saveStayConnectedSection } from "@/lib/stay-connected"
import { color, radius } from "@/lib/theme"
import type { StayConnectedSection } from "@/lib/stay-connected"

/**
 * Section-level settings for "Stay Connected": enable/disable, heading and
 * subtitle. The links themselves are managed in the list below.
 */
export function SectionSettingsForm({ section }: { section: StayConnectedSection }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(section.enabled)
  const [title, setTitle] = useState(section.title)
  const [subtitle, setSubtitle] = useState(section.subtitle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      await saveStayConnectedSection({ enabled, title, subtitle })
      router.refresh()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save — try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        p: { xs: 2, sm: 2.5 },
        mb: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: `${radius.input}px`,
              backgroundColor: color.brand[50],
              color: color.brand[700],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SocialIcon icon="link" size={19} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>Section</Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Controls the card shown on the member dashboard.
            </Typography>
          </Box>
        </Box>

        <Box
          component="button"
          type="button"
          onClick={() => setEnabled((v) => !v)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.625,
            borderRadius: 999,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: enabled ? color.success.soft : color.neutral.soft,
            color: enabled ? color.success.ink : color.neutral.ink,
            fontSize: 12,
            fontWeight: 650,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: enabled ? color.success.main : color.neutral.main,
            }}
          />
          {enabled ? "Visible" : "Hidden"}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Section title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          size="medium"
          placeholder="Stay Connected"
        />
        <TextField
          label="Section subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          size="medium"
          multiline
          minRows={2}
          placeholder="Follow MyKIZ for the latest announcements, events and student activities."
        />
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 1.5 }}>
          {error}
        </Typography>
      )}
      {saved && !error && (
        <Typography variant="caption" sx={{ color: color.success.ink, display: "block", mt: 1.5, fontWeight: 600 }}>
          Section saved.
        </Typography>
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <KButton loading={loading} icon="save" onClick={handleSave}>
          Save Section
        </KButton>
      </Box>
    </Box>
  )
}

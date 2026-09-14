"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import { analyzeTicket, applyTicketCategory } from "../ai-actions"
import type { TriageResult } from "@/lib/ai/types"
import { KIcon } from "@/components/kiz/primitives/icon"
import { helpdeskCategoryMeta } from "@/lib/helpdesk-meta"
import { color, radius } from "@/lib/theme"

const PRIORITY_TONE: Record<string, { soft: string; ink: string }> = {
  urgent: color.danger,
  high: color.warning,
  normal: color.info,
  low: color.neutral,
}

export function AiAssist({ ticketId, onUseDraft }: { ticketId: string; onUseDraft: (text: string) => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TriageResult | null>(null)
  const [applied, setApplied] = useState(false)

  async function analyse() {
    setOpen(true)
    setLoading(true)
    setApplied(false)
    try {
      setResult(await analyzeTicket(ticketId))
    } finally {
      setLoading(false)
    }
  }

  async function apply() {
    if (!result?.category) return
    const res = await applyTicketCategory(ticketId, result.category)
    if (res.success) {
      setApplied(true)
      router.refresh()
    }
  }

  const priority = result?.priority?.toLowerCase() ?? "normal"
  const tone = PRIORITY_TONE[priority] ?? color.neutral
  const cat = result?.category ? helpdeskCategoryMeta(result.category) : null

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.75 }}>
        <Button
          size="small"
          onClick={analyse}
          startIcon={<KIcon icon="auto_awesome" size={15} />}
          sx={{ textTransform: "none", color: color.brand[700] }}
        >
          AI assist
        </Button>
        {!open && (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            Categorise, prioritise &amp; draft a reply
          </Typography>
        )}
        {open && (
          <Box
            component="button"
            aria-label="Hide AI assist"
            onClick={() => setOpen(false)}
            sx={{ ml: "auto", border: "none", background: "transparent", cursor: "pointer", color: "text.disabled", display: "flex" }}
          >
            <KIcon icon="close" size={16} />
          </Box>
        )}
      </Box>

      {open && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, color: "text.secondary" }}>
              <CircularProgress size={15} />
              <Typography variant="caption">KIZ-AI is reading the ticket…</Typography>
            </Box>
          ) : result && !result.enabled ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              AI assist is off — add a Gemini API key in App Settings.
            </Typography>
          ) : result?.error ? (
            <Typography variant="caption" sx={{ color: color.danger.ink }}>
              {result.error}
            </Typography>
          ) : result ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                p: 1.25,
                borderRadius: `${radius.card}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: color.brand[50],
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {cat && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 1,
                      py: 0.375,
                      borderRadius: "999px",
                      backgroundColor: cat.tone.soft,
                      color: cat.tone.ink,
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}
                  >
                    <KIcon icon={cat.icon} size={12} />
                    {cat.label}
                  </Box>
                )}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 1,
                    py: 0.375,
                    borderRadius: "999px",
                    backgroundColor: tone.soft,
                    color: tone.ink,
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {priority} priority
                </Box>
                {!applied ? (
                  <Button size="small" onClick={apply} sx={{ textTransform: "none", ml: "auto" }}>
                    Apply category
                  </Button>
                ) : (
                  <Typography variant="caption" sx={{ ml: "auto", color: color.success.ink, fontWeight: 600 }}>
                    Category applied
                  </Typography>
                )}
              </Box>

              {result.summary && (
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                  {result.summary}
                </Typography>
              )}

              {result.suggestedReply && (
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: `${radius.input}px`,
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block", mb: 0.5 }}>
                    SUGGESTED REPLY
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {result.suggestedReply}
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onUseDraft(result.suggestedReply ?? "")}
                      startIcon={<KIcon icon="edit" size={14} />}
                      sx={{ textTransform: "none" }}
                    >
                      Use draft
                    </Button>
                  </Box>
                </Box>
              )}

              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                AI draft — review before sending.
              </Typography>
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  )
}

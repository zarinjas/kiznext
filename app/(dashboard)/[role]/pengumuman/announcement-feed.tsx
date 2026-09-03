"use client"

import { useEffect, useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"

interface Announcement {
  id: string
  title: string
  content: string
  tag: string
  attachmentUrl: string | null
  attachmentType: string | null
  isPinned: boolean
  createdAt: Date
  poster: { name: string }
}

interface Props {
  announcements: Announcement[]
  tags: string[]
}

export function AnnouncementFeed({ announcements, tags }: Props) {
  const [activeTag, setActiveTag] = useState<string>("all")

  const filtered = useMemo(
    () =>
      (activeTag === "all" ? announcements : announcements.filter((a) => a.tag === activeTag)).sort((a, b) =>
        a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1
      ),
    [announcements, activeTag]
  )

  // "New" badge time. Starts null so the server and first client render agree
  // (no time-based text), then fills after mount to avoid a hydration mismatch.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const id = window.setTimeout(() => setNow(Date.now()), 0)
    return () => window.clearTimeout(id)
  }, [])
  const isNew = (d: Date) => now !== null && now - new Date(d).getTime() < 86400000

  return (
    <Box>
      {/* Scrollable filter rail — native chip-bar behaviour on mobile */}
      <Box
        className="scroll-x"
        sx={{
          gap: 1,
          mb: 2.5,
          mx: { xs: -2, sm: 0 },
          px: { xs: 2, sm: 0 },
        }}
      >
        {["all", ...tags].map((tag) => {
          const active = activeTag === tag
          return (
            <Box
              key={tag}
              component="button"
              onClick={() => setActiveTag(tag)}
              sx={{
                textTransform: "capitalize",
                height: 32,
                px: 1.75,
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? "transparent" : "divider",
                backgroundColor: active ? "text.primary" : "background.paper",
                color: active ? "background.paper" : "text.secondary",
                fontSize: 13,
                fontWeight: 550,
                letterSpacing: "-0.011em",
                cursor: "pointer",
                whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                transition: "background-color 140ms, color 140ms, border-color 140ms",
                "&:active": { opacity: 0.7 },
              }}
            >
              {tag === "all" ? "All" : tag}
            </Box>
          )
        })}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {filtered.length === 0 && (
          <KEmpty icon="campaign" title="Nothing to see here" body="Try a different tag." compact />
        )}

        {filtered.map((a, i) => {
          const isPin = a.isPinned
          const isImportant = a.tag === "important"
          const isRecent = isNew(a.createdAt)

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.3) }}
            >
              <Box
                sx={{
                  borderRadius: `${radius.cardLg}px`,
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                  p: { xs: 2, sm: 2.5 },
                  transition: "border-color 160ms ease",
                  "@media (hover: hover)": { "&:hover": { borderColor: color.borderStrong } },
                }}
              >
                {/* Meta row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                  {isPin && (
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.primary" }}>
                      <KIcon icon="push_pin" size={14} filled />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Pinned
                      </Typography>
                    </Box>
                  )}
                  <Box
                    component="span"
                    sx={{
                      textTransform: "capitalize",
                      fontSize: 11.5,
                      fontWeight: 550,
                      px: 1,
                      py: 0.25,
                      borderRadius: 999,
                      backgroundColor: isImportant ? color.danger.soft : "action.hover",
                      color: isImportant ? color.danger.ink : "text.secondary",
                    }}
                  >
                    {a.tag}
                  </Box>
                  {isRecent && (
                    <Box
                      component="span"
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 550,
                        px: 1,
                        py: 0.25,
                        borderRadius: 999,
                        backgroundColor: color.info.soft,
                        color: color.info.ink,
                      }}
                    >
                      New
                    </Box>
                  )}
                  <Typography variant="caption" sx={{ color: "text.disabled", ml: "auto" }}>
                    {new Date(a.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                  </Typography>
                </Box>

                <Typography variant="h3" sx={{ mb: 0.5 }}>
                  {a.title}
                </Typography>

                <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {a.content}
                </Typography>

                {a.attachmentType === "image" && a.attachmentUrl && (
                  <Box
                    component="a"
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: "block", mt: 1.75 }}
                  >
                    <Box
                      component="img"
                      src={a.attachmentUrl}
                      alt=""
                      sx={{
                        width: "100%",
                        maxWidth: 420,
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    />
                  </Box>
                )}

                {a.attachmentType === "pdf" && a.attachmentUrl && (
                  <Box
                    component="a"
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      mt: 1.75,
                      px: 1.5,
                      py: 0.875,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      fontSize: 13,
                      fontWeight: 550,
                      color: "text.primary",
                      textDecoration: "none",
                      "&:active": { backgroundColor: "action.hover" },
                      "@media (hover: hover)": { "&:hover": { backgroundColor: "action.hover" } },
                    }}
                  >
                    <KIcon icon="description" size={16} />
                    Open PDF
                  </Box>
                )}

                <Typography variant="caption" sx={{ display: "block", color: "text.disabled", mt: 1.5 }}>
                  {a.poster.name}
                </Typography>
              </Box>
            </motion.div>
          )
        })}
      </Box>
    </Box>
  )
}

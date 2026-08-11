"use client"

import { useMemo, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import { motion } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, elevation } from "@/lib/theme"

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

  const [now] = useState(() => Date.now())
  const isNew = (d: Date) => now - new Date(d).getTime() < 86400000

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
        {["all", ...tags].map((tag) => (
          <Chip
            key={tag}
            label={tag === "all" ? "All" : tag}
            size="small"
            onClick={() => setActiveTag(tag)}
            sx={{
              textTransform: "capitalize",
              backgroundColor: activeTag === tag ? "primary.main" : "background.paper",
              color: activeTag === tag ? "#fff" : "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              fontWeight: 600,
              "&:hover": { backgroundColor: activeTag === tag ? "primary.main" : "action.hover" },
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {filtered.length === 0 && (
          <KEmpty icon="campaign" title="No announcements" body="Try a different tag." compact />
        )}
        {filtered.map((a, i) => {
          const isPin = a.isPinned
          const tagIsPenting = a.tag === "penting"
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
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: isPin ? color.brand[400] : "divider",
                  backgroundColor: "background.paper",
                  boxShadow: elevation.e1,
                  p: 2.5,
                  transition: "box-shadow 200ms ease",
                  "&:hover": { boxShadow: elevation.e2 },
                }}
              >
                {isPin && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
                    <KIcon icon="push_pin" size={14} sx={{ color: color.brand[700] }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: color.brand[700] }}>
                      Important Announcement
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: tagIsPenting ? color.danger.soft : color.brand[50],
                      color: tagIsPenting ? color.danger.ink : color.brand[700],
                    }}
                  >
                    <KIcon icon="campaign" size={20} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Chip
                        label={a.tag}
                        size="small"
                        sx={{
                          textTransform: "capitalize",
                          backgroundColor: tagIsPenting ? color.danger.soft : color.brand[50],
                          color: tagIsPenting ? color.danger.ink : color.brand[700],
                          fontWeight: 600,
                        }}
                      />
                      {isRecent && (
                        <Box
                          component="span"
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: color.info.ink,
                            backgroundColor: color.info.soft,
                            borderRadius: 999,
                            px: 1,
                            py: 0.25,
                          }}
                        >
                          New
                        </Box>
                      )}
                      {a.attachmentType === "pdf" && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, color: "text.secondary" }}>
                          <KIcon icon="attach_file" size={13} />
                          <Typography variant="caption">PDF</Typography>
                        </Box>
                      )}
                    </Box>

                    <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif", mt: 0.5 }}>
                      {a.title}
                    </Typography>

                    <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", mt: 0.5 }}>
                      {a.content}
                    </Typography>

                    {a.attachmentType === "image" && a.attachmentUrl && (
                      <Box
                        component="a"
                        href={a.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ display: "block", mt: 1.5 }}
                      >
                        <Box
                          component="img"
                          src={a.attachmentUrl}
                          alt=""
                          sx={{ width: "100%", maxWidth: 360, aspectRatio: "16/9", objectFit: "cover", borderRadius: 2, border: "1px solid", borderColor: "divider" }}
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
                          mt: 1.5,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 1.5,
                          backgroundColor: "action.hover",
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "text.primary",
                          textDecoration: "none",
                          "&:hover": { backgroundColor: color.brand[50], color: color.brand[700] },
                        }}
                      >
                        <KIcon icon="description" size={16} />
                        Open PDF Attachment
                      </Box>
                    )}

                    <Typography variant="caption" sx={{ display: "block", color: "text.disabled", mt: 1 }}>
                      {a.poster.name} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          )
        })}
      </Box>
    </Box>
  )
}

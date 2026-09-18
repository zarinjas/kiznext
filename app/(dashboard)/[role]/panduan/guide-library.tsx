"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Tabs from "@mui/material/Tabs"
import Tab from "@mui/material/Tab"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"
import { GUIDE_CATEGORIES, GUIDE_CATEGORY_META, guideCategoryMeta } from "@/lib/guide-meta"
import type { GuideCategory } from "@/app/generated/prisma/client"
import type { Role } from "@/lib/rbac"

export interface GuideCard {
  id: string
  title: string
  description: string | null
  category: GuideCategory
  coverImage: string | null
  pageCount: number | null
  isPinned: boolean
  isNew: boolean
  sizeLabel: string | null
  displayDate: string
}

export function GuideLibrary({ role, guides }: { role: Role; guides: GuideCard[] }) {
  const [filter, setFilter] = useState<"all" | GuideCategory>("all")
  const filtered = useMemo(
    () => (filter === "all" ? guides : guides.filter((g) => g.category === filter)),
    [guides, filter]
  )

  if (guides.length === 0) {
    return (
      <KEmpty
        icon="menu_book"
        title="No guides published yet"
        body="The KIZ office hasn't uploaded any guides. Check back soon."
      />
    )
  }

  return (
    <Box>
      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2.5, minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none", fontSize: 13.5 } }}
      >
        <Tab value="all" label={`All (${guides.length})`} />
        {GUIDE_CATEGORIES.map((c) => {
          const count = guides.filter((g) => g.category === c).length
          if (!count) return null
          return <Tab key={c} value={c} label={`${GUIDE_CATEGORY_META[c].label} (${count})`} />
        })}
      </Tabs>

      {filtered.length === 0 ? (
        <KEmpty compact icon="filter_alt_off" title="Nothing here yet" body="Try another category." />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {filtered.map((g) => (
            <GuideTile key={g.id} role={role} guide={g} />
          ))}
        </Box>
      )}
    </Box>
  )
}

function GuideTile({ role, guide }: { role: Role; guide: GuideCard }) {
  const meta = guideCategoryMeta(guide.category)
  const bits = [guide.pageCount ? `${guide.pageCount} pages` : null, guide.sizeLabel, guide.displayDate].filter(Boolean)

  return (
    <Box
      component={Link}
      href={`/${role}/panduan/${guide.id}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
        height: "100%",
        transition: "border-color 160ms, transform 160ms, box-shadow 160ms",
        WebkitTapHighlightColor: "transparent",
        "@media (hover: hover)": {
          "&:hover": {
            borderColor: color.borderStrong,
            transform: "translateY(-2px)",
            boxShadow: "0 6px 24px rgba(9,9,11,0.07)",
          },
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: guide.coverImage ? undefined : color.canvasSunk,
          borderBottom: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {guide.coverImage ? (
          <Box component="img" src={guide.coverImage} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: meta.tone.soft,
              color: meta.tone.ink,
            }}
          >
            <KIcon icon={meta.icon} size={28} />
          </Box>
        )}

        <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 0.75 }}>
          {guide.isPinned && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.4,
                px: 0.75,
                py: 0.25,
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 600,
                backgroundColor: color.warning.soft,
                color: color.warning.ink,
              }}
            >
              <KIcon icon="push_pin" size={12} />
              Pinned
            </Box>
          )}
          {guide.isNew && (
            <Box
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 700,
                backgroundColor: color.brand[600],
                color: "#fff",
              }}
            >
              NEW
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, p: 2, flex: 1 }}>
        <Box
          sx={{
            alignSelf: "flex-start",
            px: 0.9,
            py: 0.2,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            backgroundColor: meta.tone.soft,
            color: meta.tone.ink,
          }}
        >
          {meta.label}
        </Box>
        <Typography
          sx={{
            fontWeight: 600,
            letterSpacing: "-0.015em",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {guide.title}
        </Typography>
        {guide.description && (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {guide.description}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: "auto", pt: 0.5, color: "text.disabled" }}>
          <KIcon icon="description" size={15} />
          <Typography variant="caption">{bits.join(" · ")}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: color.brand[700], fontSize: 13.5, fontWeight: 600 }}>
          <KIcon icon="auto_stories" size={17} />
          Read now
          <KIcon icon="arrow_forward" size={16} />
        </Box>
      </Box>
    </Box>
  )
}

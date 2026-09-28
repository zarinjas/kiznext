"use client"

import Box from "@mui/material/Box"
import { color, radius } from "@/lib/theme"
import { COHORT_LABELS, type Cohort } from "@/lib/student-cohort"

/** A student's cohort, including the "unknown" bucket (unparseable matric). */
export type StudentCohort = Cohort | "unknown"

const LABELS: Record<StudentCohort, string> = { ...COHORT_LABELS, unknown: "Unknown" }

const TONE: Record<StudentCohort, { soft: string; ink: string }> = {
  junior: { soft: color.info.soft, ink: color.info.ink },
  senior: { soft: color.brand[50], ink: color.brand[700] },
  postgrad: { soft: color.accent[50], ink: color.accent[700] },
  unknown: { soft: color.canvasSunk, ink: color.ink[500] },
}

export function cohortLabel(cohort: StudentCohort): string {
  return LABELS[cohort]
}

/** Small tinted pill for the Junior / Senior / Postgrad / Unknown cohort. */
export function CohortChip({ cohort }: { cohort: StudentCohort }) {
  const tone = TONE[cohort]
  return (
    <Box
      sx={{
        display: "inline-block",
        px: 0.75,
        py: 0.125,
        borderRadius: 1,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: tone.soft,
        color: tone.ink,
        whiteSpace: "nowrap",
      }}
    >
      {LABELS[cohort]}
    </Box>
  )
}

const FILTER_OPTIONS: { value: "all" | StudentCohort; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
  { value: "postgrad", label: "Postgrad" },
  { value: "unknown", label: "Unknown" },
]

/** Filter chips for the cohort dimension — used by the student lists. */
export function CohortFilterChips({
  value,
  onChange,
  allLabel = "All",
}: {
  value: "all" | StudentCohort
  onChange: (v: "all" | StudentCohort) => void
  allLabel?: string
}) {
  const options = [{ value: "all" as const, label: allLabel }, ...FILTER_OPTIONS]
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
      {options.map((o) => (
        <Box
          key={o.value}
          component="button"
          onClick={() => onChange(o.value)}
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: `${radius.pill}px`,
            border: "1px solid",
            borderColor: value === o.value ? "transparent" : "divider",
            backgroundColor: value === o.value ? "primary.main" : "background.paper",
            color: value === o.value ? "primary.contrastText" : "text.secondary",
            fontWeight: 600,
            fontSize: 12.5,
            cursor: "pointer",
          }}
        >
          {o.label}
        </Box>
      ))}
    </Box>
  )
}

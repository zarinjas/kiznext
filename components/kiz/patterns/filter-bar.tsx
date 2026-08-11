"use client"

import Box from "@mui/material/Box"
import TextField from "@mui/material/TextField"
import Chip from "@mui/material/Chip"
import InputAdornment from "@mui/material/InputAdornment"
import { KIcon } from "@/components/kiz/primitives/icon"

/** FilterBar — search input + filter chips. */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Search…",
  filters,
  active,
  onFilter,
}: {
  search?: string
  onSearch?: (v: string) => void
  searchPlaceholder?: string
  filters?: string[]
  active?: string
  onFilter?: (v: string) => void
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2.5 }}>
      {onSearch && (
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <KIcon icon="search" size={18} sx={{ color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      {filters && filters.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label="All"
            size="small"
            onClick={() => onFilter?.("all")}
            sx={{
              backgroundColor: active === "all" ? "primary.main" : "transparent",
              color: active === "all" ? "#fff" : "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { backgroundColor: active === "all" ? "primary.main" : "action.hover" },
            }}
          />
          {filters.map((f) => (
            <Chip
              key={f}
              label={f}
              size="small"
              onClick={() => onFilter?.(f)}
              sx={{
                backgroundColor: active === f ? "primary.main" : "transparent",
                color: active === f ? "#fff" : "text.secondary",
                border: "1px solid",
                borderColor: "divider",
                textTransform: "capitalize",
                "&:hover": { backgroundColor: active === f ? "primary.main" : "action.hover" },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

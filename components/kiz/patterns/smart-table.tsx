"use client"

import Box from "@mui/material/Box"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme as useMuiTheme } from "@mui/material/styles"
import { DataGrid, type GridColDef, type GridRenderCellParams, type GridRowModel } from "@mui/x-data-grid"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color } from "@/lib/theme"

interface Props<T extends GridRowModel> {
  columns: GridColDef[]
  rows: T[]
  getRowId?: (row: T) => string
  emptyIcon?: string
  emptyTitle: string
  emptyBody?: string
  density?: "compact" | "standard"
  hideFooter?: boolean
  onRowClick?: (row: T) => void
}

/**
 * SmartTable — desktop: MUI X DataGrid with our hairline/uppercase styling.
 * Mobile (<600px): falls back to stacked card rows, no horizontal scroll.
 */
export function SmartTable<T extends GridRowModel>({
  columns,
  rows,
  getRowId,
  emptyIcon = "inbox",
  emptyTitle,
  emptyBody,
  density = "compact",
  hideFooter = true,
  onRowClick,
}: Props<T>) {
  const theme = useMuiTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  if (rows.length === 0) {
    return <KEmpty icon={emptyIcon} title={emptyTitle} body={emptyBody} compact />
  }

  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {rows.map((row) => {
          const key = getRowId ? getRowId(row) : (row.id as string)
          return (
            <Box
              key={key}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                cursor: onRowClick ? "pointer" : "default",
              }}
            >
              {columns.map((c) => (
                <Box key={c.field} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                  <Box component="span" sx={{ color: "text.secondary", fontSize: 12, fontWeight: 600 }}>
                    {c.headerName}
                  </Box>
                  <Box sx={{ textAlign: "right" }}>{c.renderCell ? c.renderCell({ row } as GridRenderCellParams) : String(row[c.field] ?? "—")}</Box>
                </Box>
              ))}
            </Box>
          )
        })}
      </Box>
    )
  }

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "background.paper",
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => (getRowId ? getRowId(r as T) : (r.id as string))}
        density={density}
        hideFooter={hideFooter}
        disableRowSelectionOnClick
        autoHeight
        onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
        sx={{
          border: "none",
          "& .MuiDataGrid-columnHeaders": { backgroundColor: "background.paper" },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 600,
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          },
          "& .MuiDataGrid-cell": { borderBottom: "1px solid", borderColor: "divider", fontSize: "0.8125rem" },
          "& .MuiDataGrid-row:hover": { backgroundColor: "action.hover" },
          "& .MuiDataGrid-row.Mui-selected, & .MuiDataGrid-row.Mui-selected:hover": {
            backgroundColor: color.brand[50],
          },
          "& .MuiDataGrid-root": { border: "none" },
        }}
      />
    </Box>
  )
}

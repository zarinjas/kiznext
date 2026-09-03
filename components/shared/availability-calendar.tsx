"use client"

import { useEffect, useState } from "react"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface BookingRange {
  id: string
  guestName: string
  startDate: Date
  endDate: Date
}

interface Props {
  bookings: BookingRange[]
}

const monthNames = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember",
]

const dayNames = ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"]

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const s = new Date(start); s.setHours(0, 0, 0, 0)
  const e = new Date(end); e.setHours(0, 0, 0, 0)
  return d >= s && d < e
}

export function AvailabilityCalendar({ bookings }: Props) {
  // "Today" starts null so the server and first client render agree (no
  // time-derived cell styling), then fills after mount — avoids a hydration
  // mismatch on the highlighted "today" cell if midnight is crossed mid-load.
  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      setToday(d)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const weeks: (number | null)[][] = []

  let day = 1
  for (let w = 0; w < 6; w++) {
    const week: (number | null)[] = []
    for (let d = 0; d < 7; d++) {
      if ((w === 0 && d < firstDayOfWeek) || day > daysInMonth) {
        week.push(null)
      } else {
        week.push(day)
        day++
      }
    }
    weeks.push(week)
    if (day > daysInMonth) break
  }

  function getDayStatus(d: number): "past" | "today" | "booked" | "free" {
    if (!today) return "free"
    const date = new Date(year, month, d); date.setHours(0, 0, 0, 0)
    if (date < today) return "past"
    if (date.getTime() === today.getTime()) return "today"
    for (const b of bookings) {
      if (isDateInRange(date, b.startDate, b.endDate)) return "booked"
    }
    return "free"
  }

  function getBookingsForDay(d: number): BookingRange[] {
    const date = new Date(year, month, d); date.setHours(0, 0, 0, 0)
    return bookings.filter((b) => isDateInRange(date, b.startDate, b.endDate))
  }

  const bookedCount = bookings.length

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <IconButton size="small" onClick={() => setViewDate(new Date(year, month - 1, 1))} aria-label="Previous month">
          <KIcon icon="chevron_left" size={20} />
        </IconButton>
        <Box sx={{ fontSize: 14.5, fontWeight: 600 }}>
          {monthNames[month]} {year}
        </Box>
        <IconButton size="small" onClick={() => setViewDate(new Date(year, month + 1, 1))} aria-label="Next month">
          <KIcon icon="chevron_right" size={20} />
        </IconButton>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
        {dayNames.map((n) => (
          <Box key={n} sx={{ fontSize: 11, fontWeight: 600, color: "text.disabled", py: 0.75 }}>
            {n}
          </Box>
        ))}
        {weeks.flat().map((d, i) => {
          if (d === null) return <Box key={`e-${i}`} />
          const status = getDayStatus(d)
          const dayBookings = getBookingsForDay(d)

          let bg = "transparent"
          let fg = "text.primary"
          if (status === "past") { bg = "transparent"; fg = "text.disabled" }
          else if (status === "today") { bg = color.brand[600]; fg = "#fff" }
          else if (status === "booked") { bg = color.warning.soft; fg = color.warning.ink }

          const cell = (
            <Box
              sx={{
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12.5,
                borderRadius: 999,
                backgroundColor: bg,
                color: fg,
                fontWeight: status === "today" ? 700 : 500,
                cursor: dayBookings.length ? "pointer" : "default",
                transition: "background-color 120ms",
              }}
            >
              {d}
            </Box>
          )

          return (
            <Box key={d} sx={{ p: 0.25 }}>
              {dayBookings.length ? (
                <Tooltip title={dayBookings.map((b) => b.guestName).join(", ")} placement="top">
                  {cell}
                </Tooltip>
              ) : (
                cell
              )}
            </Box>
          )
        })}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5, fontSize: 11.5, color: "text.secondary" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color.warning.soft, border: "1px solid", borderColor: color.warning.main }} />
          Booked
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 999, backgroundColor: color.brand[600] }} />
          Today
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "transparent", border: "1px solid", borderColor: "divider" }} />
          Free
        </Box>
        <Box component="span" sx={{ ml: "auto", color: "text.disabled" }}>
          {bookedCount} active booking{bookedCount === 1 ? "" : "s"}
        </Box>
      </Box>
    </Box>
  )
}

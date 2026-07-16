"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const s = new Date(start)
  s.setHours(0, 0, 0, 0)
  const e = new Date(end)
  e.setHours(0, 0, 0, 0)
  return d >= s && d < e
}

export function AvailabilityCalendar({ bookings }: Props) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

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

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
    setTooltip(null)
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
    setTooltip(null)
  }

  function getDayStatus(d: number): "past" | "today" | "booked" | "free" {
    const date = new Date(year, month, d)
    date.setHours(0, 0, 0, 0)
    if (date < today) return "past"
    if (date.getTime() === today.getTime()) return "today"
    for (const b of bookings) {
      if (isDateInRange(date, b.startDate, b.endDate)) return "booked"
    }
    return "free"
  }

  function getBookingsForDay(d: number): BookingRange[] {
    const date = new Date(year, month, d)
    date.setHours(0, 0, 0, 0)
    return bookings.filter((b) => isDateInRange(date, b.startDate, b.endDate))
  }

  function handleDayHover(e: React.MouseEvent, d: number) {
    const dayBookings = getBookingsForDay(d)
    if (dayBookings.length === 0) {
      setTooltip(null)
      return
    }
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
      text: dayBookings.map((b) => b.guestName).join(", "),
    })
  }

  return (
    <div className="relative">
      {/* Header bulan */}
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="xs" onClick={prevMonth}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {monthNames[month]} {year}
        </span>
        <Button variant="ghost" size="xs" onClick={nextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {dayNames.map((n) => (
          <div key={n} className="py-1">{n}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {weeks.flat().map((d, i) => {
          if (d === null) return <div key={`e-${i}`} />

          const status = getDayStatus(d)
          const dayBookings = getBookingsForDay(d)

          let bg = "text-foreground"
          if (status === "past") bg = "text-muted-foreground/40"
          else if (status === "today") bg = "bg-primary text-white rounded-full"
          else if (status === "booked") bg = "bg-red-100 text-red-700 rounded-full"

          return (
            <div
              key={d}
              className={`relative flex aspect-square cursor-pointer items-center justify-center text-xs transition-colors hover:ring-1 hover:ring-primary/40 ${bg}`}
              onMouseEnter={(e) => handleDayHover(e, d)}
              onMouseLeave={() => setTooltip(null)}
            >
              {d}
              {status === "booked" && (
                <span className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-red-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{ left: tooltip.x, top: tooltip.y, transform: "translateX(-50%)" }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-red-100" /> Booked
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-full bg-primary" /> Today
        </span>
      </div>
    </div>
  )
}

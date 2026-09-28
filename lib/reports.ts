import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"

/**
 * Read-only analytics for the principal / admins. Plain aggregates — no chart
 * library dependency; the page renders them with MUI X Charts.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const WEEKS = 8

export interface ReportsData {
  generatedAt: string
  totals: {
    activeResidents: number
    totalBeds: number
    occupiedBeds: number
    occupancyPct: number
    openTickets: number
    pendingBookings: number
    checkInsThisWeek: number
  }
  bookingsByWeek: { label: string; facility: number; guestHouse: number }[]
  ticketsByStatus: { status: string; count: number }[]
  ticketsByCategory: { category: string; count: number }[]
  occupancyByBlock: { block: string; occupied: number; free: number }[]
}

const dateLabel = (d: Date) =>
  new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short" }).format(d)

function weekStartKL(now: Date): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? 6 : day - 1 // back to Monday
  d.setDate(d.getDate() - diff)
  return d
}

export async function getReportsData(): Promise<ReportsData> {
  const now = nowMalaysia()
  const weekStart = weekStartKL(now)
  const windowStart = new Date(weekStart.getTime() - (WEEKS - 1) * WEEK_MS)

  const [
    activeResidents,
    beds,
    openTickets,
    pendingFacility,
    pendingGH,
    checkInsThisWeek,
    ticketStatusRows,
    ticketCategoryRows,
    facilityRecent,
    ghRecent,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "ahli", accountStatus: "active", deletedAt: null } }),
    prisma.bed.findMany({
      where: { deletedAt: null, room: { deletedAt: null, block: { deletedAt: null } } },
      select: { occupantId: true, room: { select: { block: { select: { name: true } } } } },
    }),
    prisma.helpdeskTicket.count({
      where: { deletedAt: null, status: { notIn: ["resolved", "closed"] } },
    }),
    prisma.facilityBooking.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.guestHouseBooking.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.checkInRecord.count({
      where: { deletedAt: null, type: "check_in", signedAt: { gte: weekStart } },
    }),
    prisma.helpdeskTicket.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.helpdeskTicket.groupBy({
      by: ["category"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.facilityBooking.findMany({
      where: { deletedAt: null, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.guestHouseBooking.findMany({
      where: { deletedAt: null, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
  ])

  const totalBeds = beds.length
  const occupiedBeds = beds.filter((b) => b.occupantId).length

  const blockMap = new Map<string, { occupied: number; free: number }>()
  for (const bed of beds) {
    const name = bed.room.block.name
    const entry = blockMap.get(name) ?? { occupied: 0, free: 0 }
    if (bed.occupantId) entry.occupied += 1
    else entry.free += 1
    blockMap.set(name, entry)
  }

  // 8 buckets, oldest → newest.
  const buckets: { label: string; facility: number; guestHouse: number }[] = []
  const indexByTime: { facility: number; guestHouse: number }[] = []
  for (let i = 0; i < WEEKS; i++) {
    const start = new Date(windowStart.getTime() + i * WEEK_MS)
    buckets.push({ label: dateLabel(start), facility: 0, guestHouse: 0 })
    indexByTime.push(buckets[i])
  }
  const bucketFor = (d: Date) => {
    const idx = Math.floor((d.getTime() - windowStart.getTime()) / WEEK_MS)
    return idx >= 0 && idx < WEEKS ? indexByTime[idx] : null
  }
  for (const b of facilityRecent) {
    const bucket = bucketFor(b.createdAt)
    if (bucket) bucket.facility += 1
  }
  for (const b of ghRecent) {
    const bucket = bucketFor(b.createdAt)
    if (bucket) bucket.guestHouse += 1
  }

  return {
    generatedAt: now.toISOString(),
    totals: {
      activeResidents,
      totalBeds,
      occupiedBeds,
      occupancyPct: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      openTickets,
      pendingBookings: pendingFacility + pendingGH,
      checkInsThisWeek,
    },
    bookingsByWeek: buckets,
    ticketsByStatus: ticketStatusRows.map((r) => ({ status: r.status, count: r._count._all })),
    ticketsByCategory: ticketCategoryRows
      .map((r) => ({ category: r.category, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    occupancyByBlock: [...blockMap.entries()]
      .map(([block, v]) => ({ block, ...v }))
      .sort((a, b) => a.block.localeCompare(b.block)),
  }
}

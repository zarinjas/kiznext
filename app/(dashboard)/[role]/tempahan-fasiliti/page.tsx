import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { FacilitiesDirectory } from "./facilities-list"

export interface FacilityCardData {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  bookable: boolean
  status: "open" | "coming_soon"
  createdAt: string
  block: { name: string }
  category: { id: string; name: string; section: "bookable" | "shared" } | null
  bookings: { timeSlotStart: Date; timeSlotEnd: Date }[]
}

/** A facilities-directory block: one fixed top heading + its category groups. */
export interface FacilityDirectorySection {
  section: "bookable" | "shared"
  groups: {
    name: string
    sortOrder: number
    facilities: FacilityCardData[]
  }[]
}

function groupFacilities(
  facilities: (FacilityCardData & { categorySort: number })[],
  includeSection: "bookable" | "shared"
): FacilityDirectorySection["groups"] {
  const wanted = facilities.filter((f) => {
    // A facility's top-level section follows its category; fall back to the
    // stored `bookable` flag when it isn't categorised yet (legacy rows).
    const section = f.category ? f.category.section : f.bookable ? "bookable" : "shared"
    return section === includeSection
  })

  const byCategory = new Map<string, { name: string; sortOrder: number; facilities: FacilityCardData[] }>()
  const push = (key: string, name: string, sortOrder: number, facility: FacilityCardData) => {
    const existing = byCategory.get(key)
    if (existing) {
      existing.facilities.push(facility)
    } else {
      byCategory.set(key, { name, sortOrder, facilities: [facility] })
    }
  }

  for (const f of wanted) {
    if (f.category) {
      push(f.category.id, f.category.name, f.categorySort, f)
    } else {
      push(`uncat-${includeSection}`, "Other Facilities", 9999, f)
    }
  }

  return [...byCategory.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((g) => ({
      ...g,
      facilities: [...g.facilities].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name)),
    }))
}

export default async function TempahanFasilitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [categories, facilities] = await Promise.all([
    prisma.facilityCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.facility.findMany({
      where: { deletedAt: null },
      include: {
        block: { select: { name: true } },
        category: { select: { id: true, name: true, section: true, sortOrder: true } },
        bookings: {
          where: { deletedAt: null, status: { notIn: ["rejected", "cancelled"] } },
          select: { timeSlotStart: true, timeSlotEnd: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ])

  const catOrder = new Map(categories.map((c) => [c.id, c.sortOrder]))

  const rows: (FacilityCardData & { categorySort: number })[] = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    featuredImage: f.featuredImage,
    gallery: f.gallery,
    price: f.price,
    capacity: f.capacity,
    bookable: f.bookable,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    block: { name: f.block.name },
    category: f.category ? { id: f.category.id, name: f.category.name, section: f.category.section } : null,
    categorySort: f.category ? (catOrder.get(f.category.id) ?? 0) : 9999,
    bookings: f.bookings.map((b) => ({ timeSlotStart: b.timeSlotStart, timeSlotEnd: b.timeSlotEnd })),
  }))

  const all: FacilityDirectorySection[] = [
    { section: "bookable", groups: groupFacilities(rows, "bookable") },
    { section: "shared", groups: groupFacilities(rows, "shared") },
  ]
  const sections = all.filter((s) => s.groups.length > 0)

  return <FacilitiesDirectory sections={sections} role={session.user.role} />
}

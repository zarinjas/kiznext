import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Facility directory — every facility with its section (`bookable`/`shared`),
 * category, block and the active booking ranges for its availability calendar.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const facilities = await prisma.facility.findMany({
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
    })

    return NextResponse.json({
      data: {
        facilities: facilities.map((f) => {
          const section = f.category?.section ?? (f.bookable ? "bookable" : "shared")
          return {
            id: f.id,
            name: f.name,
            description: f.description,
            featuredImage: f.featuredImage,
            gallery: f.gallery,
            price: f.price,
            capacity: f.capacity,
            timeSlotDuration: f.timeSlotDuration,
            maxPerDay: f.maxPerDay,
            bookable: f.bookable,
            status: f.status,
            section,
            categoryName: f.category?.name ?? "Other Facilities",
            blockName: f.block?.name ?? null,
            bookings: f.bookings.map((b) => ({
              start: b.timeSlotStart.toISOString(),
              end: b.timeSlotEnd.toISOString(),
            })),
          }
        }),
      },
    })
  } catch (err) {
    console.error("[api/v1/facilities] failed", err)
    return serverError("Couldn't load facilities.")
  }
}

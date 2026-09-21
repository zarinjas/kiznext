import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Guest houses + the active booking ranges that block each house's calendar. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [houses, activeBookings] = await Promise.all([
      prisma.guestHouse.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
      prisma.guestHouseBooking.findMany({
        where: { deletedAt: null, status: { notIn: ["rejected", "cancelled"] } },
        select: { id: true, guestHouseId: true, guestName: true, startDate: true, endDate: true },
      }),
    ])

    return NextResponse.json({
      data: {
        guestHouses: houses.map((h) => ({
          id: h.id,
          name: h.name,
          description: h.description,
          featuredImage: h.featuredImage,
          gallery: h.gallery,
          price: h.price,
          capacity: h.capacity,
          maxDays: h.maxDays,
          requiresApproval: h.requiresApproval,
        })),
        activeBookings: activeBookings.map((b) => ({
          id: b.id,
          guestHouseId: b.guestHouseId,
          guestName: b.guestName,
          startDate: b.startDate.toISOString(),
          endDate: b.endDate.toISOString(),
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/guest-houses] failed", err)
    return serverError("Couldn't load guest houses.")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The signed-in user's own facility + guest-house bookings ("My Bookings"). */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [facilityBookings, guestHouseBookings] = await Promise.all([
      prisma.facilityBooking.findMany({
        where: { userId: auth.user.id, deletedAt: null },
        include: { facility: { select: { name: true, featuredImage: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.guestHouseBooking.findMany({
        where: { userId: auth.user.id, deletedAt: null },
        include: { guestHouse: { select: { name: true, featuredImage: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      data: {
        facilityBookings: facilityBookings.map((b) => ({
          id: b.id,
          facilityName: b.facility.name,
          facilityImage: b.facility.featuredImage,
          timeSlotStart: b.timeSlotStart.toISOString(),
          timeSlotEnd: b.timeSlotEnd.toISOString(),
          bookingRef: b.bookingRef,
          status: b.status,
          pdfUrl: b.pdfUrl,
          purpose: b.purpose,
        })),
        guestHouseBookings: guestHouseBookings.map((b) => ({
          id: b.id,
          guestHouseName: b.guestHouse.name,
          guestHouseImage: b.guestHouse.featuredImage,
          guestName: b.guestName,
          startDate: b.startDate.toISOString(),
          endDate: b.endDate.toISOString(),
          periodType: b.periodType,
          status: b.status,
          paymentStatus: b.paymentStatus,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/bookings] failed", err)
    return serverError("Couldn't load your bookings.")
  }
}

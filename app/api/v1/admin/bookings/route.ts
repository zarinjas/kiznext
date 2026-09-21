import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, serverError } from "@/lib/mobile-auth"
import { ADMIN_ROLES, GUEST_HOUSE_ROLES } from "@/lib/rbac"
import type { BookingStatus, GuestHouseBookingStatus } from "@/app/generated/prisma/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Approval centre — facility + guest-house bookings awaiting action. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!GUEST_HOUSE_ROLES.includes(auth.user.role) && !ADMIN_ROLES.includes(auth.user.role)) {
    return forbidden("Approvals are for the KIZ office.")
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending"

  const facilityWhere =
    status === "all"
      ? { deletedAt: null }
      : { deletedAt: null, status: status as BookingStatus }
  const guestHouseWhere =
    status === "all"
      ? { deletedAt: null }
      : { deletedAt: null, status: status as GuestHouseBookingStatus }

  try {
    const [facilityBookings, guestHouseBookings] = await Promise.all([
      prisma.facilityBooking.findMany({
        where: facilityWhere,
        include: {
          facility: { select: { name: true } },
          user: { select: { name: true, matricId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.guestHouseBooking.findMany({
        where: guestHouseWhere,
        include: {
          guestHouse: { select: { name: true } },
          user: { select: { name: true, matricId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ])

    return NextResponse.json({
      data: {
        facilityBookings: facilityBookings.map((b) => ({
          id: b.id,
          facilityName: b.facility.name,
          userName: b.user.name,
          userMatric: b.user.matricId,
          timeSlotStart: b.timeSlotStart.toISOString(),
          timeSlotEnd: b.timeSlotEnd.toISOString(),
          purpose: b.purpose,
          notes: b.notes,
          status: b.status,
          bookingRef: b.bookingRef,
          createdAt: b.createdAt.toISOString(),
        })),
        guestHouseBookings: guestHouseBookings.map((b) => ({
          id: b.id,
          guestHouseName: b.guestHouse.name,
          userName: b.user.name,
          userMatric: b.user.matricId,
          guestName: b.guestName,
          periodType: b.periodType,
          startDate: b.startDate.toISOString(),
          endDate: b.endDate.toISOString(),
          status: b.status,
          paymentStatus: b.paymentStatus,
          notes: b.notes,
          createdAt: b.createdAt.toISOString(),
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/admin/bookings] failed", err)
    return serverError("Couldn't load bookings.")
  }
}

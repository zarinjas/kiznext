import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/**
 * Create a guest-house booking. Mirrors `createGHBooking` in
 * `rumah-tamu/actions.ts` (max-stay + clash checks) with a JSON body.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const guestHouseId = typeof body?.guestHouseId === "string" ? body.guestHouseId : ""
  const guestName = typeof body?.guestName === "string" ? body.guestName.trim() : ""
  const periodType = body?.periodType
  const startRaw = typeof body?.startDate === "string" ? body.startDate : ""
  const endRaw = typeof body?.endDate === "string" ? body.endDate : ""
  const notes = typeof body?.notes === "string" ? body.notes.trim() : ""

  if (!guestHouseId || !guestName || !periodType || !startRaw || !endRaw) {
    return badRequest("Please fill all required fields.")
  }
  if (periodType !== "daily" && periodType !== "weekly" && periodType !== "monthly") {
    return badRequest("Pick a booking period.")
  }

  const start = new Date(startRaw)
  const end = new Date(endRaw)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return badRequest("Those dates don't look right.")
  }
  if (start >= end) return badRequest("End date must be after start date.")

  try {
    const guestHouse = await prisma.guestHouse.findFirst({
      where: { id: guestHouseId, deletedAt: null },
    })
    if (!guestHouse) return badRequest("Guest house not found.")

    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    if (guestHouse.maxDays && nights > guestHouse.maxDays) {
      return badRequest(`Maximum stay is ${guestHouse.maxDays} day${guestHouse.maxDays === 1 ? "" : "s"}.`)
    }

    const clash = await prisma.guestHouseBooking.findFirst({
      where: {
        deletedAt: null,
        guestHouseId,
        status: { notIn: ["rejected", "cancelled"] },
        startDate: { lt: end },
        endDate: { gt: start },
      },
    })
    if (clash) return badRequest("Those dates are already booked.")

    const created = await prisma.guestHouseBooking.create({
      data: {
        guestHouseId,
        userId: auth.user.id,
        guestName,
        periodType,
        startDate: start,
        endDate: end,
        notes: notes || null,
      },
      select: { id: true },
    })

    return NextResponse.json({ data: { id: created.id } })
  } catch (err) {
    console.error("[api/v1/bookings/guest-house] failed", err)
    return serverError("Couldn't create the booking.")
  }
}

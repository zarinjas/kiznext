import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"

/** Cancel your own pending guest-house booking (mirrors `cancelGHBooking`). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const { id } = await params

  try {
    const booking = await prisma.guestHouseBooking.findUnique({ where: { id } })
    if (!booking || booking.deletedAt) return badRequest("Booking not found.")
    if (booking.userId !== auth.user.id) return badRequest("Not your booking.")
    if (booking.status !== "pending") return badRequest("Only pending bookings can be cancelled.")

    await prisma.guestHouseBooking.update({ where: { id }, data: { status: "cancelled" } })
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/bookings/guest-house/cancel] failed", err)
    return serverError("Couldn't cancel the booking.")
  }
}

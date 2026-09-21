import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { generateBookingRef, generateFacilityPdf } from "@/lib/pdf"

export const runtime = "nodejs"

/**
 * Create a facility booking. Mirrors `createFacilityBooking` in
 * `tempahan-fasiliti/actions.ts` (same clash check, `maxPerDay` limit and
 * `KIZ-BKG-NNNN` reference) but reads a JSON body instead of FormData.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  const facilityId = typeof body?.facilityId === "string" ? body.facilityId : ""
  const date = typeof body?.date === "string" ? body.date : ""
  const timeStart = typeof body?.timeStart === "string" ? body.timeStart : ""
  const timeEnd = typeof body?.timeEnd === "string" ? body.timeEnd : ""
  const purpose = typeof body?.purpose === "string" ? body.purpose : ""
  const notes = typeof body?.notes === "string" ? body.notes : ""

  if (!facilityId || !date || !timeStart || !timeEnd) {
    return badRequest("Please fill all required fields.")
  }

  const startDate = new Date(`${date}T${timeStart}:00`)
  const endDate = new Date(`${date}T${timeEnd}:00`)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return badRequest("That date or time doesn't look right.")
  }
  if (startDate >= endDate) return badRequest("End time must be after start time.")

  try {
    const clash = await prisma.facilityBooking.findFirst({
      where: {
        facilityId,
        deletedAt: null,
        status: { notIn: ["rejected", "cancelled"] },
        timeSlotStart: { lt: endDate },
        timeSlotEnd: { gt: startDate },
      },
    })
    if (clash) return badRequest("That time slot is already booked.")

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } })
    if (!facility) return badRequest("Facility not found.")
    if (!facility.bookable) return badRequest("This is a shared facility — no advance booking needed.")
    if (facility.status !== "open") return badRequest("This facility isn't open for booking yet.")

    if (facility.maxPerDay) {
      const count = await prisma.facilityBooking.count({
        where: {
          userId: auth.user.id,
          facilityId,
          deletedAt: null,
          status: { notIn: ["rejected", "cancelled"] },
          timeSlotStart: { gte: new Date(`${date}T00:00:00`), lt: new Date(`${date}T23:59:59`) },
        },
      })
      if (count >= facility.maxPerDay) {
        return badRequest(`Daily booking limit is ${facility.maxPerDay} times.`)
      }
    }

    const bookingRef = await generateBookingRef()
    const booking = await prisma.facilityBooking.create({
      data: {
        facilityId,
        userId: auth.user.id,
        timeSlotStart: startDate,
        timeSlotEnd: endDate,
        purpose: purpose || null,
        notes: notes || null,
        bookingRef,
      },
      include: { facility: { select: { name: true, price: true } }, user: { select: { name: true, matricId: true } } },
    })

    try {
      const pdfUrl = await generateFacilityPdf({
        bookingRef,
        facilityName: booking.facility.name,
        userName: booking.user.name,
        userMatric: booking.user.matricId,
        purpose: purpose || "",
        date: startDate,
        timeStart,
        timeEnd,
        notes: notes || null,
        price: booking.facility.price,
      })
      await prisma.facilityBooking.update({ where: { id: booking.id }, data: { pdfUrl } })
    } catch (pdfErr) {
      console.error("[api/v1/bookings/facility] PDF generation failed:", pdfErr)
    }

    return NextResponse.json({ data: { bookingRef, id: booking.id } })
  } catch (err) {
    console.error("[api/v1/bookings/facility] failed", err)
    return serverError("Couldn't create the booking.")
  }
}

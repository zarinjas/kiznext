"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { generateBookingRef, generateFacilityPdf } from "@/lib/pdf"

export async function createFacilityBooking(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const facilityId = formData.get("facilityId") as string
  const date = formData.get("date") as string
  const timeStart = formData.get("timeStart") as string
  const timeEnd = formData.get("timeEnd") as string
  const purpose = formData.get("purpose") as string
  const notes = formData.get("notes") as string

  if (!facilityId || !date || !timeStart || !timeEnd) {
    throw new Error("Please fill all required fields")
  }

  const startDate = new Date(`${date}T${timeStart}:00`)
  const endDate = new Date(`${date}T${timeEnd}:00`)

  if (startDate >= endDate) throw new Error("End time must be after start time")

  // Check clash
  const clash = await prisma.facilityBooking.findFirst({
    where: {
      facilityId,
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
      timeSlotStart: { lt: endDate },
      timeSlotEnd: { gt: startDate },
    },
  })
  if (clash) throw new Error("Time slot already booked")

  // Check max per day
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } })
  if (facility?.maxPerDay) {
    const todayBookings = await prisma.facilityBooking.count({
      where: {
        userId: session.user.id,
        facilityId,
        deletedAt: null,
        status: { notIn: ["rejected", "cancelled"] },
        timeSlotStart: {
          gte: new Date(`${date}T00:00:00`),
          lt: new Date(`${date}T23:59:59`),
        },
      },
    })
    if (todayBookings >= facility.maxPerDay) {
      throw new Error(`Daily booking limit is ${facility.maxPerDay} times`)
    }
  }

  // Generate booking ref
  const bookingRef = await generateBookingRef()

  // Create booking
  const booking = await prisma.facilityBooking.create({
    data: {
      facilityId,
      userId: session.user.id,
      timeSlotStart: startDate,
      timeSlotEnd: endDate,
      purpose: purpose || null,
      notes: notes || null,
      bookingRef,
    },
    include: {
      facility: { select: { name: true, price: true } },
      user: { select: { name: true, matricId: true } },
    },
  })

  // Auto-generate PDF
  try {
    const pdfUrl = await generateFacilityPdf({
      bookingRef,
      facilityName: booking.facility.name,
      userName: booking.user.name,
      userMatric: booking.user.matricId,
      purpose: purpose || "-",
      date: startDate,
      timeStart,
      timeEnd,
      notes: notes || null,
      price: booking.facility.price,
    })

    await prisma.facilityBooking.update({
      where: { id: booking.id },
      data: { pdfUrl },
    })
  } catch (err) {
    console.error("PDF generation failed:", err)
    // Tak blocking — booking tetap jadi
  }

  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
  revalidatePath(`/${session.user.role}/urus-tempahan-fasiliti`)
  return bookingRef
}

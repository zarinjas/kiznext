"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createBooking(
  facilityId: string,
  start: string,
  end: string
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const timeSlotStart = new Date(start)
  const timeSlotEnd = new Date(end)

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
  })
  if (!facility) throw new Error("Facility not found")

  const clash = await prisma.facilityBooking.findFirst({
    where: {
      facilityId,
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
      timeSlotStart: { lt: timeSlotEnd },
      timeSlotEnd: { gt: timeSlotStart },
    },
  })
  if (clash) throw new Error("Time slot already booked by another user")

  await prisma.facilityBooking.create({
    data: {
      facilityId,
      userId: session.user.id,
      timeSlotStart,
      timeSlotEnd,
      status: facility.requiresApproval ? "pending" : "approved",
      notes: null,
    },
  })

  revalidatePath(`/${session.user.role}/tempahan`)
}

export async function getUserBookings(role: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.facilityBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: { facility: true },
    orderBy: { createdAt: "desc" },
  })
}

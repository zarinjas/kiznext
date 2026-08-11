"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createGHBooking(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const guestName = formData.get("guestName") as string
  const periodType = formData.get("periodType") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const notes = formData.get("notes") as string | null

  if (!guestName || !periodType || !startDate || !endDate) {
    throw new Error("Please fill all required fields")
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start >= end) throw new Error("End date must be after start date")

  const clash = await prisma.guestHouseBooking.findFirst({
    where: {
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
      startDate: { lt: end },
      endDate: { gt: start },
    },
  })
  if (clash) throw new Error("Dates already booked")

  await prisma.guestHouseBooking.create({
    data: {
      userId: session.user.id,
      guestName,
      periodType: periodType as "daily" | "weekly" | "monthly",
      startDate: start,
      endDate: end,
      notes: notes || null,
    },
  })

  revalidatePath(`/${session.user.role}/rumah-tamu`)
}

export async function getUserGHBookings(_role: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.guestHouseBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

export async function cancelGHBooking(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const booking = await prisma.guestHouseBooking.findUnique({
    where: { id: bookingId },
  })

  if (!booking || booking.userId !== session.user.id) {
    throw new Error("Not your booking")
  }

  if (booking.status !== "pending") {
    throw new Error("Only pending bookings can be cancelled")
  }

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  })

  revalidatePath(`/${session.user.role}/rumah-tamu`)
}

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

  if (!guestName || !periodType || !startDate || !endDate) {
    throw new Error("Sila isi semua ruangan")
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start >= end) throw new Error("Tarikh tamat mesti selepas tarikh mula")

  const clash = await prisma.guestHouseBooking.findFirst({
    where: {
      deletedAt: null,
      status: { notIn: ["rejected", "cancelled"] },
      startDate: { lt: end },
      endDate: { gt: start },
    },
  })
  if (clash) throw new Error("Tarikh sudah ditempah")

  await prisma.guestHouseBooking.create({
    data: {
      userId: session.user.id,
      guestName,
      periodType: periodType as "daily" | "weekly" | "monthly",
      startDate: start,
      endDate: end,
    },
  })

  revalidatePath(`/${session.user.role}/rumah-tamu`)
}

export async function getUserGHBookings(role: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.guestHouseBooking.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

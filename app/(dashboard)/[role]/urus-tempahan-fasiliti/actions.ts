"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function approveFacility(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: { status: "approved", approvedById: session.user.id },
  })

  revalidatePath(`/${session.user.role}/urus-tempahan-fasiliti`)
}

export async function rejectFacility(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: { status: "rejected" },
  })

  revalidatePath(`/${session.user.role}/urus-tempahan-fasiliti`)
}

export async function cancelBooking(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const booking = await prisma.facilityBooking.findUnique({
    where: { id: bookingId },
  })
  if (!booking || booking.userId !== session.user.id) throw new Error("Bukan tempahan anda")
  if (booking.status !== "pending") throw new Error("Hanya tempahan menunggu boleh dibatalkan")

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
  })

  revalidatePath(`/${session.user.role}/tempahan-fasiliti`)
}

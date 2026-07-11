"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function approveGH(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { status: "approved", approvedById: session.user.id },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function rejectGH(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { status: "rejected" },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function checkInGH(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { status: "checked_in" },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function checkOutGH(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { status: "checked_out" },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

export async function markPaidGH(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.guestHouseBooking.update({
    where: { id: bookingId },
    data: { paymentStatus: "paid_manual" },
  })

  revalidatePath(`/${session.user.role}/urus-rumah-tamu`)
}

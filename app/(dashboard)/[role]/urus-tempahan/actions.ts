"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function approveBooking(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: {
      status: "approved",
      approvedById: session.user.id,
    },
  })

  revalidatePath(`/${session.user.role}/urus-tempahan`)
}

export async function rejectBooking(bookingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.facilityBooking.update({
    where: { id: bookingId },
    data: { status: "rejected" },
  })

  revalidatePath(`/${session.user.role}/urus-tempahan`)
}

"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

export async function markArrived(matricId: string, description: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const user = await prisma.user.findUnique({ where: { matricId } })
  if (!user || user.deletedAt) throw new Error("Pelajar tidak dijumpai")

  await prisma.parcel.create({
    data: {
      userId: user.id,
      description: description || null,
      status: "arrived",
      notifiedAt: new Date(),
    },
  })

  revalidatePath(`/${session.user.role}/urus-parcel`)
}

export async function markCollected(parcelId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  await prisma.parcel.update({
    where: { id: parcelId },
    data: { status: "collected", collectedAt: new Date() },
  })

  revalidatePath(`/${session.user.role}/urus-parcel`)
}

export async function getStudentParcels() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.parcel.findMany({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  })
}

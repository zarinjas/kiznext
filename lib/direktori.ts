"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"
import type { DestinationType } from "@/app/generated/prisma/client"
import { typeIcon } from "@/lib/direktori-meta"

export type DestinationInput = {
  name: string
  type: DestinationType
  latitude: number
  longitude: number
  indoor: boolean
  building?: string | null
  description?: string | null
  sortOrder?: number
  icon?: string
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  return session.user.role as Role
}

function validateInput(data: DestinationInput): DestinationInput {
  const name = data.name.trim()
  if (!name) throw new Error("Destination needs a name.")
  if (!Number.isFinite(data.latitude) || data.latitude < -90 || data.latitude > 90) {
    throw new Error("Latitude must be a number between -90 and 90.")
  }
  if (!Number.isFinite(data.longitude) || data.longitude < -180 || data.longitude > 180) {
    throw new Error("Longitude must be a number between -180 and 180.")
  }
  return {
    name,
    type: data.type,
    latitude: data.latitude,
    longitude: data.longitude,
    indoor: data.indoor,
    building: data.building?.trim() || null,
    description: data.description?.trim() || null,
    sortOrder: Number.isFinite(data.sortOrder) ? data.sortOrder! : 0,
    icon: (data.icon?.trim() || typeIcon(data.type)).trim() || "place",
  }
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}/direktori`)
  revalidatePath(`/${role}/urus-direktori`)
}

export async function createDestination(data: DestinationInput) {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.destination.create({
    data: {
      name: d.name,
      type: d.type,
      latitude: d.latitude,
      longitude: d.longitude,
      indoor: d.indoor,
      building: d.building,
      description: d.description,
      sortOrder: d.sortOrder,
      icon: d.icon,
    },
  })
  revalidateFor(role)
}

export async function updateDestination(id: string, data: DestinationInput) {
  const role = await requireAdmin()
  const d = validateInput(data)
  await prisma.destination.update({
    where: { id },
    data: {
      name: d.name,
      type: d.type,
      latitude: d.latitude,
      longitude: d.longitude,
      indoor: d.indoor,
      building: d.building,
      description: d.description,
      sortOrder: d.sortOrder,
      icon: d.icon,
    },
  })
  revalidateFor(role)
}

export async function deleteDestination(id: string) {
  const role = await requireAdmin()
  await prisma.destination.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
  revalidateFor(role)
}

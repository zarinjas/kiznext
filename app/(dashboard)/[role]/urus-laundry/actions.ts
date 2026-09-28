"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireRole, LAUNDRY_MANAGE_ROLES, type Role } from "@/lib/rbac"
import { nowMalaysia } from "@/lib/timezone"

async function requireManager() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, LAUNDRY_MANAGE_ROLES)
  return session
}

export interface LaundryMachineInput {
  name: string
  location?: string | null
  imageUrl?: string | null
  sortOrder?: number
}

function normalise(input: LaundryMachineInput) {
  const name = input.name.trim()
  if (!name) throw new Error("Give the machine a name.")
  return {
    name,
    location: input.location?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    sortOrder: Number.isFinite(input.sortOrder) ? Math.trunc(input.sortOrder as number) : 0,
  }
}

export async function createLaundryMachine(input: LaundryMachineInput) {
  const session = await requireManager()
  await prisma.laundryMachine.create({ data: normalise(input) })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

export async function updateLaundryMachine(id: string, input: LaundryMachineInput) {
  const session = await requireManager()
  const existing = await prisma.laundryMachine.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw new Error("Machine not found.")
  await prisma.laundryMachine.update({ where: { id }, data: normalise(input) })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

export async function setMachineOutOfService(id: string, outOfService: boolean) {
  const session = await requireManager()
  const existing = await prisma.laundryMachine.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw new Error("Machine not found.")
  await prisma.laundryMachine.update({
    where: { id },
    data: { status: outOfService ? "out_of_service" : "available" },
  })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

/** Admin force-clears whatever reminder is running on a machine. */
export async function clearMachineReminder(machineId: string) {
  const session = await requireManager()
  await prisma.laundryReminder.updateMany({
    where: { machineId, deletedAt: null, endedAt: null },
    data: { endedAt: nowMalaysia(), endedReason: "cleared" },
  })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

export async function deleteLaundryMachine(id: string) {
  const session = await requireManager()
  const existing = await prisma.laundryMachine.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw new Error("Machine not found.")
  await prisma.laundryMachine.update({ where: { id }, data: { deletedAt: nowMalaysia() } })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

/** Shared fallback photo shown on machines that don't have their own image. */
export async function setLaundryDefaultImage(imageUrl: string) {
  const session = await requireManager()
  const value = imageUrl.trim()
  await prisma.appSetting.upsert({
    where: { key: "laundry_default_image" },
    update: { value },
    create: { key: "laundry_default_image", value },
  })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

export async function removeLaundryDefaultImage() {
  const session = await requireManager()
  await prisma.appSetting.upsert({
    where: { key: "laundry_default_image" },
    update: { value: "" },
    create: { key: "laundry_default_image", value: "" },
  })
  revalidatePath(`/${session.user.role}/urus-laundry`)
  revalidatePath(`/${session.user.role}/laundry`)
}

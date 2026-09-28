"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

/**
 * Upcoming activities ("Upcoming at KIZ"). Events are displayed on the member
 * dashboard and managed from `/urus-aktiviti`.
 */

export type EventInput = {
  title: string
  description?: string | null
  venue?: string | null
  /** RFC date-time (ISO) for the start. Stored as-is (see urus-bilik dates). */
  startsAt: string
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session.user.role as Role
}

function validateInput(data: EventInput): { title: string; description: string | null; venue: string | null; startsAt: Date } {
  const title = data.title.trim()
  if (!title) throw new Error("Event needs a title.")
  const startsAt = new Date(data.startsAt)
  if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a valid start date & time.")
  return {
    title,
    description: data.description?.trim() || null,
    venue: data.venue?.trim() || null,
    startsAt,
  }
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}`)
  revalidatePath(`/${role}/urus-aktiviti`)
}

export async function createEvent(data: EventInput) {
  const role = await requireAdmin()
  const e = validateInput(data)
  await prisma.event.create({
    data: { title: e.title, description: e.description, venue: e.venue, startsAt: e.startsAt },
  })
  revalidateFor(role)
}

export async function updateEvent(id: string, data: EventInput) {
  const role = await requireAdmin()
  const e = validateInput(data)
  await prisma.event.update({
    where: { id },
    data: { title: e.title, description: e.description, venue: e.venue, startsAt: e.startsAt },
  })
  revalidateFor(role)
}

export async function deleteEvent(id: string) {
  const role = await requireAdmin()
  await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidateFor(role)
}

"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { canSelect, nowMalaysia, windowState } from "@/lib/room-selection"
import { getActiveIntake, getActiveWindow, resolveEligibleStudent } from "@/lib/bilik"
import { revalidatePath } from "next/cache"

type ApplicationType = "single" | "double" | "flexible"

export async function checkRoommate(matricId: string): Promise<{ ok: boolean; race?: string | null; religion?: string | null; error?: string }> {
  try {
    const { student } = await studentContext()
    const normalized = matricId.trim().toUpperCase()
    if (!normalized || normalized === student.matricId) return { ok: false, error: "We could not verify that roommate. Check the matric ID and try again." }
    const intake = await getActiveIntake()
    const roommate = intake ? await prisma.eligibleStudent.findFirst({ where: { intakeId: intake.id, matricId: normalized, deletedAt: null } }) : null
    if (!roommate || roommate.gender !== student.gender) return { ok: false, error: "We could not verify that roommate. Check the matric ID and try again." }
    const existing = await prisma.roomApplication.findFirst({ where: { roommateId: roommate.id, deletedAt: null, status: { in: ["roommate_pending", "roommate_confirmed"] } } })
    if (existing) return { ok: false, error: "We could not verify that roommate. Check the matric ID and try again." }
    return { ok: true, race: roommate.race, religion: roommate.religion }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not verify roommate" }
  }
}

async function studentContext() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["ahli"])
  const [student, win] = await Promise.all([
    resolveEligibleStudent(session.user.id, session.user.matricId),
    getActiveWindow(),
  ])
  if (!student) throw new Error("You are not on the current accepted-student list")
  if (!win) throw new Error("The accommodation application window is not configured")
  const state = windowState({ opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours }, nowMalaysia())
  if (!canSelect(state)) throw new Error("The accommodation application window is closed")
  return { session, student, win }
}

export async function submitRoomApplication(input: {
  type: ApplicationType
  roommateMatricId?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { student } = await studentContext()
    const type = input.type
    const confirmed = await prisma.roomApplication.findFirst({
      where: { OR: [{ applicantId: student.id }, { roommateId: student.id }], status: "roommate_confirmed", deletedAt: null },
    })
    if (confirmed) return { ok: false, error: "A confirmed roommate request is final and cannot be changed." }
    const incoming = await prisma.roomApplication.findFirst({
      where: { roommateId: student.id, status: { in: ["roommate_pending", "roommate_confirmed"] }, deletedAt: null },
    })
    if (incoming) return { ok: false, error: "Respond to your pending roommate request before submitting another preference." }
    if (type === "double" && !input.roommateMatricId?.trim()) {
      return { ok: false, error: "Enter your roommate's matric ID" }
    }
    let roommateId: string | null = null
    if (type === "double") {
      const matricId = input.roommateMatricId!.trim().toUpperCase()
      if (matricId === student.matricId) return { ok: false, error: "You cannot choose yourself as a roommate" }
      const intake = await getActiveIntake()
      const roommate = intake ? await prisma.eligibleStudent.findFirst({ where: { intakeId: intake.id, matricId, deletedAt: null } }) : null
      if (!roommate) return { ok: false, error: "We could not verify that roommate. Check the matric ID and try again." }
      if (roommate.gender !== student.gender) return { ok: false, error: "Roommates must be the same gender." }
      const existing = await prisma.roomApplication.findFirst({ where: { roommateId: roommate.id, deletedAt: null, status: { in: ["roommate_pending", "roommate_confirmed"] } } })
      if (existing) return { ok: false, error: "That student already has an active roommate request." }
      roommateId = roommate.id
    }
    await prisma.roomApplication.upsert({
      where: { applicantId: student.id },
      update: { type, roommateId, status: type === "single" ? "single_pending" : type === "double" ? "roommate_pending" : "flexible_submitted", submittedAt: nowMalaysia(), respondedAt: null, deletedAt: null },
      create: { applicantId: student.id, type, roommateId, status: type === "single" ? "single_pending" : type === "double" ? "roommate_pending" : "flexible_submitted" },
    })
    revalidatePath("/ahli/bilik")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Application failed" }
  }
}

export async function respondToRoommateRequest(response: "approved" | "rejected"): Promise<{ ok: boolean; error?: string }> {
  try {
    const { student } = await studentContext()
    const request = await prisma.roomApplication.findFirst({ where: { roommateId: student.id, status: "roommate_pending", deletedAt: null }, include: { applicant: true } })
    if (!request) return { ok: false, error: "There is no pending roommate request." }
    if (response === "rejected") {
      await prisma.roomApplication.update({ where: { id: request.id }, data: { status: "roommate_rejected", respondedAt: nowMalaysia() } })
    } else {
      const ownApplication = await prisma.roomApplication.findFirst({ where: { applicantId: student.id, deletedAt: null } })
      if (ownApplication) return { ok: false, error: "Withdraw your existing preference before confirming this roommate request." }
      await prisma.roomApplication.update({ where: { id: request.id }, data: { status: "roommate_confirmed", respondedAt: nowMalaysia() } })
    }
    revalidatePath("/ahli/bilik")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update request" }
  }
}

export async function withdrawRoomApplication(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { student } = await studentContext()
    const confirmed = await prisma.roomApplication.findFirst({
      where: { OR: [{ applicantId: student.id }, { roommateId: student.id }], status: "roommate_confirmed", deletedAt: null },
    })
    if (confirmed) return { ok: false, error: "A confirmed roommate request is final and cannot be withdrawn." }
    await prisma.roomApplication.updateMany({ where: { applicantId: student.id, deletedAt: null }, data: { status: "withdrawn", deletedAt: nowMalaysia() } })
    revalidatePath("/ahli/bilik")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not withdraw application" }
  }
}

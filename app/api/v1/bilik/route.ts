import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { getApplicationState, getActiveIntake, getActiveWindow, resolveEligibleStudent } from "@/lib/bilik"
import { canSelect, nowMalaysia, windowState } from "@/lib/room-selection"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ApplicationType = "single" | "double" | "flexible"

/** Room selection is student-only (matches the web `bilik` page). */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Room selection is for students only.")

  try {
    const state = await getApplicationState(auth.user.id, auth.user.matricId)
    return NextResponse.json({ data: { state } })
  } catch (err) {
    console.error("[api/v1/bilik] failed", err)
    return serverError("Couldn't load room selection.")
  }
}

/** Guard mirrors the web `studentContext()` in `bilik/actions.ts`. */
async function studentContext(userId: string, matricId: string) {
  const [student, win] = await Promise.all([resolveEligibleStudent(userId, matricId), getActiveWindow()])
  if (!student) throw new Error("You are not on the current accepted-student list.")
  if (student.bed) throw new Error("Room selection is closed — you already have a room assigned.")
  if (!win) throw new Error("The accommodation application window is not configured.")
  const state = windowState(
    { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
    nowMalaysia()
  )
  if (!canSelect(state)) throw new Error("The accommodation application window is closed.")
  return { student }
}

/** Submit (or replace) the student's room preference. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Room selection is for students only.")

  const body = await req.json().catch(() => null)
  const type = body?.type as ApplicationType
  const roommateMatricId = typeof body?.roommateMatricId === "string" ? body.roommateMatricId : undefined

  if (type !== "single" && type !== "double" && type !== "flexible") {
    return badRequest("Pick a room preference.")
  }

  try {
    const { student } = await studentContext(auth.user.id, auth.user.matricId)

    const confirmed = await prisma.roomApplication.findFirst({
      where: {
        OR: [{ applicantId: student.id }, { roommateId: student.id }],
        status: "roommate_confirmed",
        deletedAt: null,
      },
    })
    if (confirmed) return badRequest("A confirmed roommate request is final and cannot be changed.")

    const incoming = await prisma.roomApplication.findFirst({
      where: {
        roommateId: student.id,
        status: { in: ["roommate_pending", "roommate_confirmed"] },
        deletedAt: null,
      },
    })
    if (incoming) {
      return badRequest("Respond to your pending roommate request before submitting another preference.")
    }

    if (type === "double" && !roommateMatricId?.trim()) {
      return badRequest("Enter your roommate's matric ID.")
    }

    let roommateId: string | null = null
    if (type === "double") {
      const matricId = roommateMatricId!.trim().toUpperCase()
      if (matricId === student.matricId) return badRequest("You cannot choose yourself as a roommate.")
      const intake = await getActiveIntake()
      const roommate = intake
        ? await prisma.eligibleStudent.findFirst({
            where: { intakeId: intake.id, matricId, deletedAt: null },
          })
        : null
      if (!roommate) return badRequest("We could not verify that roommate. Check the matric ID and try again.")
      if (roommate.gender !== student.gender) return badRequest("Roommates must be the same gender.")
      const existing = await prisma.roomApplication.findFirst({
        where: {
          roommateId: roommate.id,
          deletedAt: null,
          status: { in: ["roommate_pending", "roommate_confirmed"] },
        },
      })
      if (existing) return badRequest("That student already has an active roommate request.")
      roommateId = roommate.id
    }

    const status =
      type === "single" ? "single_pending" : type === "double" ? "roommate_pending" : "flexible_submitted"

    await prisma.roomApplication.upsert({
      where: { applicantId: student.id },
      update: { type, roommateId, status, submittedAt: nowMalaysia(), respondedAt: null, deletedAt: null },
      create: { applicantId: student.id, type, roommateId, status },
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Application failed."
    console.error("[api/v1/bilik submit] failed", err)
    return badRequest(message)
  }
}

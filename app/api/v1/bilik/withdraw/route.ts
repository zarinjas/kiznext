import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { getActiveWindow, resolveEligibleStudent } from "@/lib/bilik"
import { canSelect, nowMalaysia, windowState } from "@/lib/room-selection"

export const runtime = "nodejs"

/** Withdraw the student's pending preference. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Room selection is for students only.")

  try {
    const [student, win] = await Promise.all([
      resolveEligibleStudent(auth.user.id, auth.user.matricId),
      getActiveWindow(),
    ])
    if (!student) return badRequest("You are not on the current accepted-student list.")
    if (!win) return badRequest("The accommodation application window is not configured.")
    const state = windowState(
      { opensAt: win.opensAt, closesAt: win.closesAt, closingSoonHours: win.closingSoonHours },
      nowMalaysia()
    )
    if (!canSelect(state)) return badRequest("The accommodation application window is closed.")

    const confirmed = await prisma.roomApplication.findFirst({
      where: {
        OR: [{ applicantId: student.id }, { roommateId: student.id }],
        status: "roommate_confirmed",
        deletedAt: null,
      },
    })
    if (confirmed) return badRequest("A confirmed roommate request is final and cannot be withdrawn.")

    await prisma.roomApplication.updateMany({
      where: { applicantId: student.id, deletedAt: null },
      data: { status: "withdrawn", deletedAt: nowMalaysia() },
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/bilik/withdraw] failed", err)
    return serverError("Could not withdraw your preference.")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, serverError } from "@/lib/mobile-auth"
import { getActiveIntake, resolveEligibleStudent } from "@/lib/bilik"

export const runtime = "nodejs"

/** Verify a roommate's matric before submitting a double request. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Room selection is for students only.")

  const body = await req.json().catch(() => null)
  const raw = typeof body?.matricId === "string" ? body.matricId : ""
  const normalized = raw.trim().toUpperCase()
  const fail = { ok: false, error: "We could not verify that roommate. Check the matric ID and try again." }

  try {
    const student = await resolveEligibleStudent(auth.user.id, auth.user.matricId)
    if (!student) return NextResponse.json({ data: fail })

    if (!normalized || normalized === student.matricId) return NextResponse.json({ data: fail })

    const intake = await getActiveIntake()
    const roommate = intake
      ? await prisma.eligibleStudent.findFirst({
          where: { intakeId: intake.id, matricId: normalized, deletedAt: null },
        })
      : null
    if (!roommate || roommate.gender !== student.gender) return NextResponse.json({ data: fail })

    const existing = await prisma.roomApplication.findFirst({
      where: {
        roommateId: roommate.id,
        deletedAt: null,
        status: { in: ["roommate_pending", "roommate_confirmed"] },
      },
    })
    if (existing) return NextResponse.json({ data: fail })

    return NextResponse.json({
      data: { ok: true, race: roommate.race, religion: roommate.religion },
    })
  } catch (err) {
    console.error("[api/v1/bilik/check-roommate] failed", err)
    return serverError("Could not verify roommate.")
  }
}

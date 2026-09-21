import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { nowMalaysia } from "@/lib/room-selection"

export const runtime = "nodejs"

/** Approve or reject an incoming roommate request. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Room selection is for students only.")

  const body = await req.json().catch(() => null)
  const response = body?.response
  if (response !== "approved" && response !== "rejected") return badRequest("Pick a response.")

  try {
    const student = await prisma.eligibleStudent.findFirst({
      where: {
        userId: auth.user.id,
        deletedAt: null,
        intake: { status: "active", deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })
    if (!student) return badRequest("You are not on the current accepted-student list.")

    const request = await prisma.roomApplication.findFirst({
      where: { roommateId: student.id, status: "roommate_pending", deletedAt: null },
      include: { applicant: true },
    })
    if (!request) return badRequest("There is no pending roommate request.")

    if (response === "rejected") {
      await prisma.roomApplication.update({
        where: { id: request.id },
        data: { status: "roommate_rejected", respondedAt: nowMalaysia() },
      })
    } else {
      const own = await prisma.roomApplication.findFirst({
        where: { applicantId: student.id, deletedAt: null },
      })
      if (own) {
        return badRequest("Withdraw your existing preference before confirming this roommate request.")
      }
      await prisma.roomApplication.update({
        where: { id: request.id },
        data: { status: "roommate_confirmed", respondedAt: nowMalaysia() },
      })
    }

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/bilik/roommate] failed", err)
    return serverError("Could not update the request.")
  }
}

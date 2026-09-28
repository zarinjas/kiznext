import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { getOpenCheckInSessions, submitCheckInRecord } from "@/lib/checkin"
import { getActiveIntake } from "@/lib/bilik"
import { roomAssignmentLabel } from "@/lib/bilik-format"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * In-app check-in overview. Identity comes from the session — the student never
 * types a matric here. Mirrors `getStudentCheckInOverview` in `lib/checkin.ts`,
 * but resolves the user from the bearer token instead of the cookie session.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [sessions, intake] = await Promise.all([getOpenCheckInSessions(), getActiveIntake()])
    const active = sessions[0] ?? null

    const student = intake
      ? await prisma.eligibleStudent.findFirst({
          where: { intakeId: intake.id, matricId: auth.user.matricId, deletedAt: null },
          include: { bed: { include: { room: { include: { block: true } } } } },
        })
      : null

    const roomLabel = student?.bed
      ? roomAssignmentLabel({
          blockName: student.bed.room.block.name,
          number: student.bed.room.number,
          position: student.bed.position,
        })
      : null

    const alreadySigned =
      active && student
        ? Boolean(
            await prisma.checkInRecord.findFirst({
              where: { sessionId: active.id, eligibleStudentId: student.id, deletedAt: null },
              select: { id: true },
            })
          )
        : false

    return NextResponse.json({
      data: {
        session: active,
        name: student?.name ?? auth.user.name,
        matricId: auth.user.matricId,
        roomLabel,
        alreadySigned,
        isStudent: auth.user.role === "ahli",
      },
    })
  } catch (err) {
    console.error("[api/v1/checkin] failed", err)
    return serverError("Couldn't load check-in.")
  }
}

/**
 * In-app check-in / check-out submit. Reuses the shared public transaction by
 * resolving the active session's token, so the recording logic stays in one
 * place (`recordSignedCheckIn` inside `lib/checkin.ts`).
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") {
    return forbidden("Only students can check in from the app. Please use the counter QR.")
  }

  const body = await req.json().catch(() => null)
  const signature = typeof body?.signature === "string" ? body.signature : ""
  if (!signature) return badRequest("Please sign in the box before submitting.")

  try {
    const active = (await getOpenCheckInSessions())[0]
    if (!active) return badRequest("No check-in session is open right now. Check with the KIZ counter.")

    const row = await prisma.checkInSession.findUnique({
      where: { id: active.id },
      select: { token: true },
    })
    if (!row) return badRequest("No check-in session is open right now.")

    const result = await submitCheckInRecord(row.token, auth.user.matricId, signature)
    if (!result.ok) return badRequest(result.error ?? "Couldn't save your signature.")

    return NextResponse.json({ data: result })
  } catch (err) {
    console.error("[api/v1/checkin submit] failed", err)
    return serverError("Couldn't save your signature.")
  }
}

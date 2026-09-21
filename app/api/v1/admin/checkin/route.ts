import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, serverError } from "@/lib/mobile-auth"
import { RESIDENCE_VIEW_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Check-in/out sessions + the most recent signed records. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!RESIDENCE_VIEW_ROLES.includes(auth.user.role)) return forbidden("Residence staff only.")

  try {
    const [sessions, records] = await Promise.all([
      prisma.checkInSession.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          opensAt: true,
          closesAt: true,
          token: true,
        },
      }),
      prisma.checkInRecord.findMany({
        where: { deletedAt: null },
        orderBy: { signedAt: "desc" },
        take: 200,
        select: {
          id: true,
          matricId: true,
          name: true,
          type: true,
          roomLabel: true,
          signedAt: true,
          manualById: true,
          sessionId: true,
        },
      }),
    ])

    const sessionNames = new Map(sessions.map((s) => [s.id, s.name]))

    return NextResponse.json({
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          isActive: s.isActive,
          opensAt: s.opensAt?.toISOString() ?? null,
          closesAt: s.closesAt?.toISOString() ?? null,
          token: s.token,
        })),
        records: records.map((r) => ({
          id: r.id,
          matricId: r.matricId,
          name: r.name,
          type: r.type,
          roomLabel: r.roomLabel,
          signedAt: r.signedAt.toISOString(),
          manual: Boolean(r.manualById),
          sessionName: sessionNames.get(r.sessionId) ?? null,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/admin/checkin] failed", err)
    return serverError("Couldn't load check-in records.")
  }
}

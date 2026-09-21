import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"
import { getCardDesign } from "@/lib/settings"
import { getResidentRoomDetail } from "@/lib/bilik"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import { addMonths, formatMalaysiaDate } from "@/lib/timezone"
import { positionLabel, type Role } from "@/lib/rbac"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Everything the mobile eCard needs. The QR itself is generated on-device. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        name: true,
        matricId: true,
        block: true,
        roomNumber: true,
        avatarUrl: true,
        role: true,
        position: true,
        ecardRegisteredAt: true,
      },
    })
    if (!user) return unauthorized()

    const isStudent = user.role === "ahli"
    const room = isStudent ? await getResidentRoomDetail(auth.user.id) : null
    const cardDesign = await getCardDesign(user.role)

    const validUntil =
      isStudent && room?.checkInAt ? formatMalaysiaDate(addMonths(room.checkInAt, 6)) : null

    return NextResponse.json({
      data: {
        card: {
          name: user.name,
          matricId: user.matricId,
          role: user.role,
          roleLabel: isStudent
            ? null
            : positionLabel(user.position) ?? ROLE_LABELS[user.role as Role] ?? null,
          block: isStudent ? room?.blockName ?? null : user.block,
          roomNumber: isStudent ? room?.roomNumber ?? null : null,
          bed: isStudent ? room?.bed ?? null : null,
          session: isStudent ? cardDesign.session : null,
          validUntil,
          avatarUrl: user.avatarUrl,
          cardBackgroundUrl: cardDesign.backgroundUrl,
          ukmLogoUrl: cardDesign.ukmLogoUrl,
          kizLogoUrl: cardDesign.kizLogoUrl,
        },
        ecardRegistered: Boolean(user.ecardRegisteredAt),
      },
    })
  } catch (err) {
    console.error("[api/v1/ecard] failed", err)
    return serverError("Couldn't load your eCard.")
  }
}

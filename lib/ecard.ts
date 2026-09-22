import { prisma } from "@/lib/db"
import { getCardDesign } from "@/lib/settings"
import { getResidentRoomDetail } from "@/lib/bilik"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import { addMonths, formatMalaysiaDate } from "@/lib/timezone"
import { positionLabel, type Role } from "@/lib/rbac"

/**
 * The Digital Resident ID payload, shared by the mobile eCard endpoint and the
 * Wallet pass builders (Google generic pass + Apple .pkpass). Keeping one loader
 * means the on-screen card and the wallet pass can never drift apart.
 */
export interface EcardCard {
  name: string
  matricId: string
  role: string
  roleLabel: string | null
  block: string | null
  roomNumber: string | null
  bed: string | null
  session: string | null
  validUntil: string | null
  avatarUrl: string | null
  cardBackgroundUrl: string | null
  ukmLogoUrl: string | null
  kizLogoUrl: string | null
}

export interface EcardSnapshot {
  card: EcardCard
  /** True once the resident has opened their eCard at least once. */
  ecardRegistered: boolean
}

/** Load the resident card for a user, or `null` when the user no longer exists. */
export async function loadEcardCard(userId: string): Promise<EcardSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
  if (!user) return null

  const isStudent = user.role === "ahli"
  const room = isStudent ? await getResidentRoomDetail(userId) : null
  const cardDesign = await getCardDesign(user.role)

  const validUntil =
    isStudent && room?.checkInAt ? formatMalaysiaDate(addMonths(room.checkInAt, 6)) : null

  return {
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
  }
}

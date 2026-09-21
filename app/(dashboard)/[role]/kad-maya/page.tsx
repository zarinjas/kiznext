import QRCode from "qrcode"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KadMayaCard } from "@/components/shared/kad-maya-card"
import { AvatarPicker } from "@/components/shared/avatar-picker"
import { EcardRegistration } from "@/components/shared/ecard-registration"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { getCardDesign } from "@/lib/settings"
import { getResidentRoomDetail } from "@/lib/bilik"
import { ROLE_LABELS } from "@/components/kiz/shell/nav-config"
import { positionLabel, type Role } from "@/lib/rbac"
import { addMonths, formatMalaysiaDate } from "@/lib/timezone"

export default async function KadMayaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
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

  if (!user) redirect("/login")

  const isStudent = user.role === "ahli"
  // A student's room is only shown once the KIZ office assigns AND publishes it.
  const room = isStudent ? await getResidentRoomDetail(user.id) : null
  // Every role shares the same card layout; the background differs per role
  // (student / fellow / shared staff). Students get the room/session lines,
  // fellows get the block they look after, others get their role label.
  const cardDesign = await getCardDesign(user.role)
  const qrDataUrl = await QRCode.toDataURL(user.matricId, { width: 220, margin: 1 })

  // Card validity = room check-in date + 6 months (one semester). Students
  // without a check-in yet get no "Valid until" line.
  const validUntil =
    isStudent && room?.checkInAt ? formatMalaysiaDate(addMonths(room.checkInAt, 6)) : null

  // The principal's office ("Timbalan Pengetua") overrides the plain role label.
  const roleLabel = isStudent
    ? null
    : positionLabel(user.position) ?? ROLE_LABELS[user.role as Role] ?? null

  // First view of the eCard "registers" it (clears the dashboard checklist
  // task). The DB write runs on the client via a server action after mount —
  // revalidation is not allowed during a server-component render.
  const isMember = user.role === "ahli" || user.role === "staf" || user.role === "fellow"

  return (
    <Box sx={{ maxWidth: 440, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PageHeader overline="Community" title="Digital Resident ID" subtitle="Your KIZ Digital Resident ID." />

      <Box sx={{ width: "100%", mt: 1 }}>
        <KadMayaCard
          name={user.name}
          matricId={user.matricId}
          block={isStudent ? room?.blockName : user.block}
          roomNumber={isStudent ? room?.roomNumber : user.roomNumber}
          bed={isStudent ? room?.bed : null}
          session={isStudent ? cardDesign?.session ?? null : null}
          validUntil={validUntil}
          avatarUrl={user.avatarUrl}
          role={user.role}
          roleLabel={roleLabel}
          cardBackgroundUrl={cardDesign?.backgroundUrl}
          ukmLogoUrl={cardDesign?.ukmLogoUrl}
          kizLogoUrl={cardDesign?.kizLogoUrl}
          qrDataUrl={qrDataUrl}
        />
      </Box>

      {/* Profile photo */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 380,
          mt: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          p: 2,
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>
            Profile Photo
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
            This photo will be used for your profile and KIZ Resident Pass.
          </Typography>
        </Box>
        <AvatarPicker avatarUrl={user.avatarUrl} name={user.name} size={56} />
      </Box>

      <Box
        sx={{
          mt: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.75,
          borderRadius: `${radius.cardLg}px`,
          backgroundColor: color.info.soft,
          color: color.info.ink,
          width: "100%",
          maxWidth: 380,
        }}
      >
        <KIcon icon="info" size={18} />
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          Show this QR code to security officers or KIZ staff for identity verification.
        </Typography>
      </Box>

      {isMember && <EcardRegistration shouldRegister={!user.ecardRegisteredAt} />}
    </Box>
  )
}

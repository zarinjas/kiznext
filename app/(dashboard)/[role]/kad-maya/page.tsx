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
import { getStudentCardDesign } from "@/lib/settings"
import { getResidentRoomDetail } from "@/lib/bilik"
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
      ecardRegisteredAt: true,
    },
  })

  if (!user) redirect("/login")

  const isStudent = user.role === "ahli"
  // A student's room is only shown once the KIZ office assigns AND publishes it.
  const room = isStudent ? await getResidentRoomDetail(user.id) : null
  const cardDesign = isStudent ? await getStudentCardDesign() : null
  const qrDataUrl = isStudent ? await QRCode.toDataURL(user.matricId, { width: 220, margin: 1 }) : null

  // Card validity = room check-in date + 6 months (one semester). Students
  // without a check-in yet get no "Valid until" line.
  const validUntil =
    isStudent && room?.checkInAt ? formatMalaysiaDate(addMonths(room.checkInAt, 6)) : null

  // First view of the eCard "registers" it (clears the dashboard checklist
  // task). The DB write runs on the client via a server action after mount —
  // revalidation is not allowed during a server-component render.
  const isMember = user.role === "ahli" || user.role === "staf" || user.role === "fellow"

  return (
    <Box sx={{ maxWidth: 440, mx: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <PageHeader overline="Community" title="eCard" subtitle="Your KIZ Digital ID Card." />

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
            Card photo
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
            Your photo appears on this eCard everywhere.
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

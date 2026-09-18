import QRCode from "qrcode"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { siteUrl } from "@/lib/site-url"
import { getAppLogoUrl, getStudentCardLogos } from "@/lib/settings"
import { getCheckinDirectionsImage } from "@/lib/checkin"
import { getActiveIntake } from "@/lib/bilik"
import { roomAssignmentLabel } from "@/lib/bilik-format"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { CheckinAdminClient } from "./checkin-admin-client"

export default async function UrusCheckinPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["superadmin", "admin_kiz", "pengetua"])

  const readOnly = session.user.role === "pengetua"

  const [sessions, records, appLogoUrl, cardLogos, directionsImageUrl, intake] = await Promise.all([
    prisma.checkInSession.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { records: true } } },
    }),
    prisma.checkInRecord.findMany({
      where: { deletedAt: null },
      orderBy: { signedAt: "desc" },
      take: 2000,
      include: { session: { select: { name: true } } },
    }),
    getAppLogoUrl(),
    getStudentCardLogos(),
    getCheckinDirectionsImage(),
    getActiveIntake(),
  ])

  // The full roster of the active intake, so the admin file lists every student
  // — not just the ones who have signed. Students without a record export blank.
  const rosterStudents = intake
    ? await prisma.eligibleStudent.findMany({
        where: { intakeId: intake.id, deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          matricId: true,
          name: true,
          bed: {
            select: {
              position: true,
              room: { select: { number: true, block: { select: { name: true } } } },
            },
          },
        },
      })
    : []

  const rosterData = rosterStudents.map((s) => ({
    matricId: s.matricId,
    name: s.name,
    blockName: s.bed?.room.block.name ?? null,
    roomNumber: s.bed?.room.number ?? null,
    bedPosition: s.bed?.position ?? null,
    roomLabel: s.bed
      ? roomAssignmentLabel({
          blockName: s.bed.room.block.name,
          number: s.bed.room.number,
          position: s.bed.position,
        })
      : null,
  }))

  const sessionsData = await Promise.all(
    sessions.map(async (s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      token: s.token,
      isActive: s.isActive,
      opensAt: s.opensAt ? s.opensAt.toISOString() : null,
      closesAt: s.closesAt ? s.closesAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      recordCount: s._count.records,
      url: siteUrl(`/checkin/${s.token}`),
      qrDataUrl: await QRCode.toDataURL(siteUrl(`/checkin/${s.token}`), { width: 720, margin: 2 }),
    })),
  )

  const recordsData = records.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    sessionName: r.session.name,
    matricId: r.matricId,
    name: r.name,
    type: r.type,
    roomLabel: r.roomLabel,
    signatureUrl: r.signatureUrl,
    manual: Boolean(r.manualById),
    signedAt: r.signedAt.toISOString(),
  }))

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Residence · Admin"
        title="Check-in / Check-out"
        subtitle="Create a QR session for move-in or move-out, print the counter sheet, and keep the signed records for the admin file."
      />
      <CheckinAdminClient
        readOnly={readOnly}
        sessions={sessionsData}
        records={recordsData}
        roster={rosterData}
        logos={{ ukmLogoUrl: cardLogos.ukmLogoUrl, appLogoUrl }}
        directionsImageUrl={directionsImageUrl}
      />
    </Box>
  )
}

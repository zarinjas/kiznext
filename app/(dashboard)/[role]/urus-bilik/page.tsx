import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { getOccupantPrivacy, getOccupancySummary } from "@/lib/bilik"
import { UrusBilikClient } from "./urus-bilik-client"
import { getOccupancy } from "./actions"

export default async function UrusBilikPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["superadmin", "admin_kiz", "pengetua"])

  const readOnly = session.user.role === "pengetua"

  // `getOccupancy` is a gated Server Action; `pengetua` may only read, so use
  // the shared read-only helper directly instead of the admin-gated action.
  const occupancy = readOnly ? await getOccupancySummary() : await getOccupancy()

  const [window, intakes, blocks, occupantPrivacy] = await Promise.all([
    prisma.selectionWindow.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.intake.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { students: true } } },
    }),
    prisma.residenceBlock.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        rooms: {
          where: { deletedAt: null },
          orderBy: [{ floor: "asc" }, { number: "asc" }],
          include: { beds: { where: { deletedAt: null } } },
        },
      },
    }),
    getOccupantPrivacy(),
  ])

  const activeIntake = intakes.find((i) => i.status === "active")
  const students = activeIntake
    ? await prisma.eligibleStudent.findMany({
        where: { intakeId: activeIntake.id, deletedAt: null },
        orderBy: { name: "asc" },
        include: { bed: { include: { room: { include: { block: true } } } } },
      })
    : []

  // Serialize to plain objects for the client component.
  const blocksData = blocks.map((b) => ({
    id: b.id,
    name: b.name,
    gender: b.gender,
    floors: b.floors,
    sortOrder: b.sortOrder,
    rooms: b.rooms.map((r) => ({
      id: r.id,
      floor: r.floor,
      number: r.number,
      type: r.type,
      status: r.status,
      totalBeds: r.beds.length,
      occupiedBeds: r.beds.filter((x) => x.occupantId).length,
    })),
  }))

  const studentsData = students.map((s) => ({
    id: s.id,
    matricId: s.matricId,
    name: s.name,
    gender: s.gender,
    isB40: s.isB40,
    isOku: s.isOku,
    isUniform: s.isUniform,
    room: s.bed ? `${s.bed.room.block.name} · ${s.bed.room.number}` : null,
    position: s.bed?.position ?? null,
    selectedAt: s.selectedAt ? s.selectedAt.toISOString() : null,
    assignedByAdmin: s.assignedByAdmin,
  }))

  const freeBeds = activeIntake
    ? await prisma.bed.findMany({
        where: {
          occupantId: null,
          deletedAt: null,
          room: { deletedAt: null, status: "available" },
        },
        include: { room: { include: { block: true } } },
        orderBy: { room: { number: "asc" } },
      })
    : []

  const freeBedsData = freeBeds.map((b) => ({
    id: b.id,
    label: `${b.room.block.name} · ${b.room.number} · ${b.position}`,
    gender: b.room.block.gender,
  }))

  return (
    <UrusBilikClient
      readOnly={readOnly}
      window={
        window
          ? {
              name: window.name,
              opensAt: window.opensAt.toISOString(),
              closesAt: window.closesAt.toISOString(),
              closingSoonHours: window.closingSoonHours,
            }
          : null
      }
      intakes={intakes.map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        rowCount: i._count.students,
        createdAt: i.createdAt.toISOString(),
      }))}
      blocks={blocksData}
      students={studentsData}
      occupancy={occupancy}
      freeBeds={freeBedsData}
      occupantPrivacy={occupantPrivacy}
    />
  )
}

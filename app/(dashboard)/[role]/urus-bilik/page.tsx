import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, type Role } from "@/lib/rbac"
import { areAllocationsPublished, getOccupancySummary, getRoomFees } from "@/lib/bilik"
import { nowMalaysia } from "@/lib/room-selection"
import { roomAssignmentLabel } from "@/lib/bilik-format"
import { getCheckInStatusForMatrics } from "@/lib/checkin"
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

  const [window, intakes, blocks, allocationsPublished, fees] = await Promise.all([
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
          include: { beds: { where: { deletedAt: null }, include: { occupant: true } } },
        },
      },
    }),
    areAllocationsPublished(),
    getRoomFees(),
  ])

  // "Publish results" unlocks only once the application period has closed.
  const windowClosed = window ? new Date(window.closesAt).getTime() <= nowMalaysia().getTime() : false

  const activeIntake = intakes.find((i) => i.status === "active")
  const students = activeIntake
    ? await prisma.eligibleStudent.findMany({
        where: { intakeId: activeIntake.id, deletedAt: null },
        orderBy: { name: "asc" },
        include: {
          bed: { include: { room: { include: { block: true } } } },
          roomApplication: { include: { roommate: true } },
          roommateApplications: { where: { deletedAt: null, status: "roommate_confirmed" }, include: { applicant: true } },
        },
      })
    : []

  // Serialize to plain objects for the client component.
  const checkInStatus = await getCheckInStatusForMatrics(students.map((s) => s.matricId))

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
      beds: r.beds.map((bed) => ({
        id: bed.id,
        position: bed.position,
        reserved: bed.reserved,
        occupant: bed.occupant ? { id: bed.occupant.id, name: bed.occupant.name, matricId: bed.occupant.matricId } : null,
      })),
    })),
  }))

  // Roommate = the other occupant of the same room. KIZ assigns rooms straight
  // from the UKM RE sheet, so there is usually no RoomApplication to read a
  // partner from — fall back to the sibling bed in the room.
  const roomOccupants = new Map<string, { id: string; name: string; matricId: string }[]>()
  for (const b of blocks) {
    for (const r of b.rooms) {
      roomOccupants.set(
        r.id,
        r.beds.filter((x) => x.occupant).map((x) => x.occupant!),
      )
    }
  }

  const studentsData = students.map((s) => ({
    id: s.id,
    matricId: s.matricId,
    name: s.name,
    gender: s.gender,
    race: s.race,
    religion: s.religion,
    nationality: s.nationality,
    faculty: s.faculty,
    yearOfStudy: s.yearOfStudy,
    currentCollege: s.currentCollege,
    merit: s.merit,
    isB40: s.isB40,
    isOku: s.isOku,
    isUniform: s.isUniform,
    room: s.bed
      ? roomAssignmentLabel({
          blockName: s.bed.room.block.name,
          number: s.bed.room.number,
          position: s.bed.position,
        })
      : null,
    position: s.bed?.position ?? null,
    selectedAt: s.selectedAt ? s.selectedAt.toISOString() : null,
    assignedByAdmin: s.assignedByAdmin,
    applicationType: s.roomApplication?.type ?? (s.roommateApplications[0] ? "double" : null),
    applicationStatus: s.roomApplication?.status ?? (s.roommateApplications[0] ? "roommate_confirmed" : null),
    roommate: s.roomApplication?.roommate
      ? `${s.roomApplication.roommate.name} · ${s.roomApplication.roommate.matricId}`
      : s.roommateApplications[0]
        ? `${s.roommateApplications[0].applicant.name} · ${s.roommateApplications[0].applicant.matricId}`
        : s.bed
          ? (roomOccupants.get(s.bed.room.id) ?? [])
              .filter((o) => o.id !== s.id)
              .map((o) => `${o.name} · ${o.matricId}`)
              .join(", ") || null
          : null,
    checkInStatus: checkInStatus[s.matricId.toUpperCase()] ?? "not_checked_in",
    isRegistered: s.isRegistered,
    contractStart: s.contractStart ? s.contractStart.toISOString() : null,
    contractEnd: s.contractEnd ? s.contractEnd.toISOString() : null,
  }))

  const freeBeds = activeIntake
    ? await prisma.bed.findMany({
        where: {
          occupantId: null,
          reserved: false,
          deletedAt: null,
          room: { deletedAt: null, status: "available" },
        },
        include: { room: { include: { block: true } } },
        orderBy: { room: { number: "asc" } },
      })
    : []

  const freeBedsData = freeBeds.map((b) => ({
    id: b.id,
    label: `${roomAssignmentLabel({
      blockName: b.room.block.name,
      number: b.room.number,
      position: b.position,
    }) ?? ""} · ${b.room.type === "single" ? "single" : "shared double"}`,
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
      allocationsPublished={allocationsPublished}
      windowClosed={windowClosed}
      fees={fees}
    />
  )
}

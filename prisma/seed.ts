import "dotenv/config"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../app/generated/prisma/client"
import bcrypt from "bcryptjs"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash("kiz123", 10)

  await prisma.user.upsert({
    where: { matricId: "ADMIN001" },
    update: { passwordHash, deletedAt: null },
    create: {
      matricId: "ADMIN001",
      name: "Super Admin",
      passwordHash,
      role: "superadmin",
      residentCardQr: "ADMIN001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "ADMIN002" },
    update: { passwordHash, deletedAt: null },
    create: {
      matricId: "ADMIN002",
      name: "Admin KIZ",
      passwordHash,
      role: "admin_kiz",
      residentCardQr: "ADMIN002",
    },
  })

  // Demo self-service staff account (@ukm.edu.my → role `staf`, member access,
  // no admin panel until promoted). Email is marked verified so it can log in.
  await prisma.user.upsert({
    where: { matricId: "STAF001" },
    update: { passwordHash, deletedAt: null, role: "staf", accountStatus: "active" },
    create: {
      matricId: "STAF001",
      name: "Staff Demo",
      email: "staff@ukm.edu.my",
      emailVerifiedAt: new Date(),
      accountStatus: "active",
      passwordHash,
      role: "staf",
      residentCardQr: "STAF001",
    },
  })

  await prisma.user.upsert({
    where: { matricId: "A123456" },
    update: { passwordHash, deletedAt: null, email: "pelajar@siswa.ukm.edu.my" },
    create: {
      matricId: "A123456",
      name: "Example Student",
      email: "pelajar@siswa.ukm.edu.my",
      passwordHash,
      role: "ahli",
      block: "A",
      roomNumber: "101",
      residentCardQr: "A123456",
      phone: "0123456789",
    },
  })

  console.log("Users seeded (password: kiz123)")

  const blockData = [
    { name: "Block A", description: "Female student residence — floors 1-4", navigationNotes: "Next to Block B, facing KIZ Square" },
    { name: "Block B", description: "Female student residence — floors 1-4", navigationNotes: "Next to Block A, beside the cafeteria" },
    { name: "Block C", description: "Male student residence — floors 1-4", navigationNotes: "Across the road from Blocks A & B" },
    { name: "Block D", description: "Male student residence — floors 1-4", navigationNotes: "Next to Block C" },
    { name: "Block E", description: "Male student residence — floors 1-4", navigationNotes: "At the end of the KIZ area, beside the parking lot" },
    { name: "KIZ Office", description: "Kolej Ibu Zain management office", navigationNotes: "Ground floor of Block A, main entrance facing KIZ Square" },
    { name: "Blok Pentadbiran", description: "Administrative block housing the KIZ administration office and the UKM Real Estate office", navigationNotes: "Facing KIZ Square, between the guest house and the cafeteria" },
  ]

  for (const b of blockData) {
    await prisma.block.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    })
  }

  console.log("Blocks seeded")

  const officeData = [
    {
      name: "Pejabat Pentadbiran KIZ",
      description: "College administration — registration, resident matters, forms, and booking approvals.",
      sortOrder: 1,
    },
    {
      name: "Pejabat UKM Real Estate",
      description: "UKM Real Estate — property, facility, and building management matters.",
      sortOrder: 2,
    },
  ]

  for (const o of officeData) {
    await prisma.office.upsert({
      where: { name: o.name },
      update: {},
      create: o,
    })
  }

  console.log("Offices seeded")

  const facilityData = [
    { name: "Main Meeting Room", blockName: "KIZ Office", description: "KIZ main meeting room — capacity 20 people", capacity: 20, requiresApproval: true },
    { name: "TV Room Block A", blockName: "Block A", description: "Lounge with TV — capacity 10 people", capacity: 10, requiresApproval: false },
    { name: "TV Room Block B", blockName: "Block B", description: "Lounge with TV — capacity 10 people", capacity: 10, requiresApproval: false },
    { name: "Surau Al-Hidayah", blockName: "Block A", description: "KIZ main surau — fits 40 worshippers", capacity: 40, requiresApproval: false },
    { name: "Laundry Block A", blockName: "Block A", description: "6 washing machines, 4 dryers", capacity: null, requiresApproval: false },
    { name: "Laundry Block B", blockName: "Block B", description: "4 washing machines, 3 dryers", capacity: null, requiresApproval: false },
    { name: "Pantry Block C", blockName: "Block C", description: "Shared pantry — fridge, microwave, kettle", capacity: null, requiresApproval: false },
    { name: "Futsal Field", blockName: "Block E", description: "Outdoor futsal field — fits 10v10", capacity: 20, requiresApproval: true },
    { name: "Study Room Block D", blockName: "Block D", description: "Quiet study space — 8 study desks", capacity: 8, requiresApproval: false },
  ]

  const blocks = await prisma.block.findMany()
  const blockMap = Object.fromEntries(blocks.map((b) => [b.name, b.id]))

  for (const f of facilityData) {
    const blockId = blockMap[f.blockName]
    if (!blockId) {
      console.warn(`Block not found: ${f.blockName}`)
      continue
    }
    await prisma.facility.upsert({
      where: { name: f.name },
      update: {},
      create: {
        name: f.name,
        blockId,
        description: f.description,
        capacity: f.capacity,
        requiresApproval: f.requiresApproval,
      },
    })
  }

  console.log("Facilities seeded")

  const guestHouseData = [
    {
      name: "Rumah Tamu KIZ",
      description: "Main guest house next to KIZ Square. En-suite rooms with air-conditioning.",
      price: 80,
      capacity: 4,
      maxDays: 14,
      requiresApproval: true,
    },
    {
      name: "Rumah Tamu VIP",
      description: "Executive suite for official college guests — living room and private bathroom.",
      price: 120,
      capacity: 2,
      maxDays: 7,
      requiresApproval: true,
    },
  ]

  for (const gh of guestHouseData) {
    await prisma.guestHouse.upsert({
      where: { name: gh.name },
      update: {},
      create: gh,
    })
  }

  console.log("Guest houses seeded")

  const student = await prisma.user.findUnique({ where: { matricId: "A123456" } })
  const admin = await prisma.user.findUnique({ where: { matricId: "ADMIN002" } })

  if (student && admin) {
    const facilities = await prisma.facility.findMany()

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const bookingData = [
      {
        facilityName: "Main Meeting Room",
        timeSlotStart: tomorrow,
        status: "approved" as const,
      },
      {
        facilityName: "Futsal Field",
        timeSlotStart: nextWeek,
        status: "pending" as const,
      },
      {
        facilityName: "TV Room Block A",
        timeSlotStart: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        status: "approved" as const,
      },
    ]

    for (const bd of bookingData) {
      const facility = facilities.find((f) => f.name === bd.facilityName)
      if (!facility) continue
      await prisma.facilityBooking.create({
        data: {
          facilityId: facility.id,
          userId: student.id,
          timeSlotStart: bd.timeSlotStart,
          timeSlotEnd: new Date(bd.timeSlotStart.getTime() + 60 * 60 * 1000),
          status: bd.status,
          approvedById: bd.status === "approved" ? admin.id : null,
          purpose: "Dummy booking",
        },
      })
    }

    console.log("Dummy bookings seeded")

    const announcementData = [
      {
        title: "Welcome to the New Semester 2024/2025!",
        content: "KIZ would like to welcome all students...",
        tag: "general",
        isPinned: true,
      },
      {
        title: "Water Supply Disruption — Blocks A & B — 17 July",
        content: "The management office would like to inform residents...",
        tag: "important",
        isPinned: true,
      },
      {
        title: "eCard Registration Required Before 31 August",
        content: "All residents are required...",
        tag: "general",
        isPinned: false,
      },
      {
        title: "KIZ Community Clean-Up — This Saturday",
        content: "Join the flagship community clean-up...",
        tag: "event",
        isPinned: false,
      },
      {
        title: "Guest House Bookings Now Open!",
        content: "Residents can now book...",
        tag: "general",
        isPinned: false,
      },
    ]

    for (const ad of announcementData) {
      await prisma.announcement.create({
        data: {
          title: ad.title,
          content: ad.content,
          tag: ad.tag,
          isPinned: ad.isPinned,
          postedBy: admin.id,
        },
      })
    }

    console.log("Dummy announcements seeded")
  }

  // ── Room selection (bilik) ────────────────────────────────────────────────
  // Residence blocks (gender-restricted), rooms + auto beds, an active intake,
  // and an open selection window so the picker is demoable right after seeding.

  // Block codes match the campus-map zones (campus-block-map.tsx). Gender is
  // admin-determined per block; students only ever see blocks of their own gender.
  const residenceBlocks = [
    { name: "K19A", gender: "male" as const, floors: 3, sortOrder: 1 },
    { name: "K19B", gender: "male" as const, floors: 3, sortOrder: 2 },
    { name: "K19C", gender: "female" as const, floors: 3, sortOrder: 3 },
    { name: "K19D", gender: "female" as const, floors: 3, sortOrder: 4 },
    { name: "K18A", gender: "male" as const, floors: 3, sortOrder: 5 },
    { name: "K18B", gender: "female" as const, floors: 3, sortOrder: 6 },
    { name: "K18C", gender: "female" as const, floors: 3, sortOrder: 7 },
    { name: "K18D", gender: "female" as const, floors: 3, sortOrder: 8 },
  ]

  const ROOMS_PER_FLOOR = 6
  for (const rb of residenceBlocks) {
    const block = await prisma.residenceBlock.upsert({
      where: { name: rb.name },
      update: { gender: rb.gender, floors: rb.floors, sortOrder: rb.sortOrder },
      create: { name: rb.name, gender: rb.gender, floors: rb.floors, sortOrder: rb.sortOrder },
    })

    // Layout per block: floors 1 & 2 are all double rooms, the top floor (3) is
    // all single rooms.
    for (let floor = 1; floor <= rb.floors; floor++) {
      const type: "single" | "double" = floor === rb.floors ? "single" : "double"
      for (let i = 1; i <= ROOMS_PER_FLOOR; i++) {
        const number = `${rb.name}-${floor}${String(i).padStart(2, "0")}`
        const existing = await prisma.residenceRoom.findFirst({
          where: { blockId: block.id, number },
        })
        if (existing) {
          // Reconcile a room whose type changed (only while it's empty).
          if (existing.type !== type) {
            const occupied = await prisma.bed.count({
              where: { roomId: existing.id, occupantId: { not: null }, deletedAt: null },
            })
            if (occupied === 0) {
              await prisma.residenceRoom.update({ where: { id: existing.id }, data: { type } })
              const beds = await prisma.bed.findMany({ where: { roomId: existing.id } })
              for (const bed of beds) {
                const keep =
                  type === "single" ? bed.position === "single" : bed.position !== "single"
                if (!keep) {
                  await prisma.bed.update({ where: { id: bed.id }, data: { deletedAt: new Date() } })
                } else if (bed.deletedAt) {
                  await prisma.bed.update({ where: { id: bed.id }, data: { deletedAt: null } })
                }
              }
              for (const position of type === "single" ? (["single"] as const) : (["left", "right"] as const)) {
                if (!beds.some((b) => b.position === position)) {
                  await prisma.bed.create({ data: { roomId: existing.id, position } })
                }
              }
            } else {
              console.warn(`Room ${number} still has occupants — type kept as ${existing.type}`)
            }
          }
          continue
        }
        const room = await prisma.residenceRoom.create({
          data: { blockId: block.id, floor, number, type, sortOrder: i },
        })
        const positions =
          type === "single" ? (["single"] as const) : (["left", "right"] as const)
        for (const position of positions) {
          await prisma.bed.create({ data: { roomId: room.id, position } })
        }
      }
    }
  }

  console.log("Residence blocks + rooms seeded")

  // Active intake with a realistic batch of accepted students. Every student gets
  // a login account (password kiz123) so any of them can be used to test the
  // accommodation application. A123456 is the demo login and stays unassigned
  // so the student application flow can be tested.
  const eligibleData = [
    { matricId: "A123456", name: "Example Student", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200001", name: "Nurul Aisyah Rahman", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200002", name: "Tan Mei Ling", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200003", name: "Ahmad Firdaus Ali", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200004", name: "Siti Nurhaliza Zainal", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200005", name: "Devi Sharmini Ramesh", gender: "female" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200006", name: "Sarah Jane Wong", gender: "female" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200007", name: "Nor Amirah Hassan", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200008", name: "Lim Wei Shan", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200009", name: "Aisyah Humaira Mohd Nor", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200010", name: "Lee Jia En", gender: "female" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200011", name: "Anis Safiya Ismail", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200012", name: "Priya Darshini Kumar", gender: "female" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200013", name: "Farah Izzati Aziz", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200014", name: "Chong Li Mei", gender: "female" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200015", name: "Nurul Huda Salleh", gender: "female" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200016", name: "Muhammad Izzat Rahman", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200017", name: "Daniel Tan Wei Ming", gender: "male" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200018", name: "Muhammad Faiz Omar", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200019", name: "Viknesh Murugan", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200020", name: "Adam Hakimi Yusof", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200021", name: "Ong Chee Hong", gender: "male" as const, religion: "Buddhist", race: "Chinese" },
    { matricId: "A200022", name: "Muhammad Syafiq Abdullah", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200023", name: "Arvin Raj Sivanandan", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200024", name: "Joshua Lee Kar Wai", gender: "male" as const, religion: "Christian", race: "Chinese" },
    { matricId: "A200025", name: "Amirul Hakim Roslan", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200026", name: "Harith Iskandar Zulkifli", gender: "male" as const, religion: "Islam", race: "Malay" },
    { matricId: "A200027", name: "Kavin Ananth Raju", gender: "male" as const, religion: "Hindu", race: "Indian" },
    { matricId: "A200028", name: "Muhd Aiman Mohd Ariffin", gender: "male" as const, religion: "Islam", race: "Malay" },
  ]

  let intake = await prisma.intake.findFirst({ where: { status: "active", deletedAt: null } })
  if (!intake) {
    const admin = await prisma.user.findUnique({ where: { matricId: "ADMIN002" } })
    intake = await prisma.intake.create({
      data: {
        name: "Session 2026/2027",
        status: "active",
        importedById: admin?.id ?? null,
        rowCount: 0,
      },
    })
  }

  const eligibleIds = new Map<string, string>()
  for (const e of eligibleData) {
    const user = await prisma.user.upsert({
      where: { matricId: e.matricId },
      update: { role: "ahli", deletedAt: null },
      create: {
        matricId: e.matricId,
        name: e.name,
        email: `${e.matricId.toLowerCase()}@siswa.ukm.edu.my`,
        passwordHash,
        role: "ahli",
        residentCardQr: e.matricId,
      },
    })
    const eligible = await prisma.eligibleStudent.upsert({
      where: { intakeId_matricId: { intakeId: intake.id, matricId: e.matricId } },
      update: { userId: user.id },
      create: {
        intakeId: intake.id,
        matricId: e.matricId,
        name: e.name,
        gender: e.gender,
        religion: e.religion,
        race: e.race,
        nationality: "Malaysia",
        faculty: "FTSM",
        yearOfStudy: "1",
        userId: user.id,
      },
    })
    eligibleIds.set(e.matricId, eligible.id)
  }

  await prisma.intake.update({
    where: { id: intake.id },
    data: { rowCount: eligibleData.length },
  })
  console.log(`Active intake + ${eligibleData.length} eligible students seeded`)

  // ── Pre-placed occupants (roommates) ──────────────────────────────────────
  // Fill beds across the male blocks (K19A/K19B) and female blocks
  // (K19C/K19D/K18B) so the picker shows a live mix of full / partial /
  // available rooms with occupant cards. Singles only exist on floor 3;
  // floors 1 & 2 are doubles (left/right).
  const occupancyPlan: Array<{ room: string; position: "left" | "right" | "single"; matricId: string }> = [
    { room: "K19A-101", position: "left", matricId: "A200003" },
    { room: "K19A-101", position: "right", matricId: "A200016" },
    { room: "K19A-102", position: "left", matricId: "A200017" },
    { room: "K19A-102", position: "right", matricId: "A200018" },
    { room: "K19A-201", position: "left", matricId: "A200019" },
    { room: "K19A-201", position: "right", matricId: "A200020" },
    { room: "K19A-202", position: "left", matricId: "A200021" },
    { room: "K19A-301", position: "single", matricId: "A200022" },
    { room: "K19B-101", position: "left", matricId: "A200023" },
    { room: "K19B-101", position: "right", matricId: "A200024" },
    { room: "K19B-102", position: "left", matricId: "A200025" },
    { room: "K19B-102", position: "right", matricId: "A200026" },
    { room: "K19B-201", position: "left", matricId: "A200027" },
    { room: "K19B-301", position: "single", matricId: "A200028" },

    { room: "K19C-101", position: "left", matricId: "A200001" },
    { room: "K19C-101", position: "right", matricId: "A200004" },
    { room: "K19C-102", position: "left", matricId: "A200005" },
    { room: "K19C-102", position: "right", matricId: "A200006" },
    { room: "K19C-201", position: "left", matricId: "A200007" },
    { room: "K19C-201", position: "right", matricId: "A200008" },
    { room: "K19C-202", position: "left", matricId: "A200009" },
    { room: "K19C-301", position: "single", matricId: "A200010" },
    { room: "K19D-101", position: "left", matricId: "A200002" },
    { room: "K19D-101", position: "right", matricId: "A200011" },
    { room: "K19D-102", position: "left", matricId: "A200012" },
    { room: "K19D-102", position: "right", matricId: "A200013" },
    { room: "K19D-201", position: "left", matricId: "A200014" },
    { room: "K18B-101", position: "left", matricId: "A200015" },
  ]

  const now = new Date()
  for (const row of occupancyPlan) {
    const studentId = eligibleIds.get(row.matricId)
    if (!studentId) continue
    const bed = await prisma.bed.findFirst({
      where: { room: { number: row.room, deletedAt: null }, position: row.position, deletedAt: null },
    })
    if (!bed) {
      console.warn(`Bed not found for occupancy plan: ${row.room} / ${row.position}`)
      continue
    }
    await prisma.$transaction(async (tx) => {
      // Move the student out of any previously held bed, then place them.
      await tx.bed.updateMany({ where: { occupantId: studentId }, data: { occupantId: null } })
      await tx.bed.update({ where: { id: bed.id }, data: { occupantId: studentId } })
      await tx.eligibleStudent.update({
        where: { id: studentId },
        // These are final-allocation fixtures for the admin inventory view, not
        // student applications. Keep them unpublished by default.
        data: { selectedAt: now, assignedByAdmin: true },
      })
      await tx.user.updateMany({
        where: { matricId: row.matricId },
        data: { block: row.room.split("-")[0], roomNumber: row.room },
      })
    })
  }
  console.log(`Dummy final allocations placed (${occupancyPlan.length} beds)`)

  await prisma.appSetting.upsert({
    where: { key: "bilik_allocations_published" },
    update: { value: "false" },
    create: { key: "bilik_allocations_published", value: "false" },
  })

  // Open accommodation application window: opened yesterday, closes in 7 days.
  const existingWindow = await prisma.selectionWindow.findFirst({ where: { isActive: true } })
  if (!existingWindow) {
    const now = new Date()
    await prisma.selectionWindow.create({
      data: {
        name: "Session 2026/2027",
        opensAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        closingSoonHours: 24,
        isActive: true,
      },
    })
    console.log("Selection window seeded (open now)")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
